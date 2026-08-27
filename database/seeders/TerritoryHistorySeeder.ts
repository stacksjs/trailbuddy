import { Seeder } from '@stacksjs/database'
import {
  calculatePolygonArea,
  geoJsonToCoordinates,
  pointInPolygon,
  polygonsOverlap,
  simplifyTrack,
} from '../../resources/functions/geo'
import { validateGpsDataForClaim } from '../../resources/functions/gpx'
import Activity from '../../app/Models/Activity'
import Territory from '../../app/Models/Territory'
import TerritoryHistory from '../../app/Models/TerritoryHistory'

/**
 * What happened to the seeded land after it was claimed.
 *
 * This used to be `factory.generate(TerritoryHistory, { count: 100 })` —
 * a hundred events pointing at territories, users and activities picked at
 * random, so the conquest feed listed people conquering land they never ran
 * near, and the battle board showed attackers with no attack behind them.
 * It stopped working when `factory` was removed from @stacksjs/database, and
 * with it went the only source of rows for `/conquests` and `/battles`, which
 * both read this table exclusively.
 *
 * A history row is not free-standing: it is the record of one activity landing
 * on one parcel. TerritorySeeder already separated the runs that claimed
 * ground from the ones that landed on ground somebody already held — this
 * seeder resolves that second set the way ProcessActivityConquestAction does:
 *
 *   - the parcel's own owner ran it → `defended` when it was under attack,
 *     otherwise a patrol, which the engine records as nothing at all
 *   - an attacker whose loop swallowed the parcel whole → `conquered`, and the
 *     land changes hands
 *   - an attacker who only cut across it → `contested`, and it stays with its
 *     owner but goes on the board as under attack
 *
 * Which of those each run produces is decided by the geometry of the run, not
 * asserted here: ActivitySeeder's sessions are laid out so a wider lap takes a
 * parcel and a partial lap only threatens it, and if those distances change
 * the outcome changes with them.
 */

/** Same floor the capture engine applies to a parcel worth fighting over. */
const MIN_TERRITORY_SIZE = 1000
const SECONDS_PER_DAY = 86400

interface Parcel {
  id: number
  user_id: number
  status: string
  area_size: number
  conquest_count: number
  claimed_at: string | null
  coordinates: Array<{ lat: number, lng: number }>
}

export default class TerritoryHistorySeeder extends Seeder {
  // After TerritorySeeder (-80): the parcels these events act on must exist.
  static order = -78

  async run(): Promise<void> {
    const rows = (await Territory.all().catch(() => [])) as any[]
    if (!rows.length) {
      console.warn('[seed] no territories; skipping territory history')
      return
    }

    const parcels: Parcel[] = rows
      .filter(row => row.polygon_data && row.area_size >= MIN_TERRITORY_SIZE)
      .map(row => ({
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        area_size: row.area_size,
        conquest_count: row.conquest_count ?? 0,
        claimed_at: row.claimed_at ?? null,
        coordinates: geoJsonToCoordinates(row.polygon_data),
      }))

    const claimedByActivity = new Set(rows.map(row => row.activity_id).filter(Boolean))

    const captured = (await Activity.where('capture_eligible', '=', true).get().catch(() => [])) as any[]
    // Oldest first: a parcel has to be contested before it can be defended,
    // and conquered before the next attacker meets its new owner.
    const attacks = captured
      .filter(activity => activity.gpx_data && !claimedByActivity.has(activity.id))
      .sort((a, b) => String(a.completed_at ?? '').localeCompare(String(b.completed_at ?? '')) || a.id - b.id)

    for (const activity of attacks) {
      const validation = validateGpsDataForClaim(activity.gpx_data)
      if (!validation.valid || !validation.coordinates)
        continue

      const route = simplifyTrack(validation.coordinates)
      const routeArea = calculatePolygonArea(route)
      const parcel = parcels.find(candidate => polygonsOverlap(route, candidate.coordinates))
      if (!parcel) {
        // The run claimed nothing and hit nothing. TerritorySeeder would have
        // claimed it, so reaching here means the two disagree about the board.
        console.warn(`[seed] activity ${activity.id} neither claimed nor met a parcel`)
        continue
      }

      const at = activity.completed_at ?? new Date().toISOString()

      if (parcel.user_id === activity.user_id) {
        // The owner running their own land. Only a parcel under attack produces
        // an event — the engine calls the quiet case a patrol and writes no
        // history for it, just a fresher timestamp.
        await Territory.forceUpdate(parcel.id, { status: 'active', last_activity_at: at })
        const wasContested = parcel.status === 'contested'
        parcel.status = 'active'
        if (!wasContested)
          continue

        await this.record(activity, parcel, {
          previous_owner_id: null,
          event_type: 'defended',
          area_at_event: parcel.area_size,
          previous_ownership_duration: null,
          notes: 'Owner ran through contested territory',
          created_at: at,
        })
        continue
      }

      const previousOwner = parcel.user_id
      const ownershipDuration = parcel.claimed_at
        ? Math.max(0, Math.floor((new Date(at).getTime() - new Date(parcel.claimed_at).getTime()) / 1000))
        : null

      // A takeover is a loop drawn right around somebody else's: the parcel's
      // centre falls inside the attacker's route and the route encloses more
      // ground than the parcel does. Anything less took a bite out of it, which
      // is a contest.
      const centre = parcel.coordinates.length
        ? {
            lat: parcel.coordinates.reduce((sum, c) => sum + c.lat, 0) / parcel.coordinates.length,
            lng: parcel.coordinates.reduce((sum, c) => sum + c.lng, 0) / parcel.coordinates.length,
          }
        : null
      const takeover = !!centre && pointInPolygon(centre, route) && routeArea >= parcel.area_size

      if (!takeover) {
        if (parcel.status === 'contested')
          continue
        await Territory.forceUpdate(parcel.id, { status: 'contested' })
        parcel.status = 'contested'
        await this.record(activity, parcel, {
          previous_owner_id: null,
          event_type: 'contested',
          area_at_event: parcel.area_size,
          previous_ownership_duration: null,
          notes: 'Attack intersected the territory without a valid split',
          created_at: at,
        })
        continue
      }

      await Territory.forceUpdate(parcel.id, {
        user_id: activity.user_id,
        status: 'active',
        conquest_count: parcel.conquest_count + 1,
        claimed_at: at,
        last_activity_at: at,
      })
      await this.record(activity, parcel, {
        previous_owner_id: previousOwner,
        event_type: 'conquered',
        area_at_event: parcel.area_size,
        previous_ownership_duration: ownershipDuration,
        notes: `Full territory conquest after ${((ownershipDuration ?? 0) / SECONDS_PER_DAY).toFixed(1)} days in the previous owner's hands`,
        created_at: at,
      })

      parcel.user_id = activity.user_id
      parcel.status = 'active'
      parcel.conquest_count += 1
      parcel.claimed_at = at
    }
  }

  /**
   * Write one event, keyed by (activity, territory, type).
   *
   * That triple is what makes an event unique in the engine too — a retried
   * request resolves the same activity against the same parcel and must not
   * double-count it — so re-seeding refreshes the row instead of stacking
   * another conquest onto the feed.
   */
  private async record(activity: any, parcel: Parcel, event: Record<string, unknown>): Promise<void> {
    const payload = {
      territory_id: parcel.id,
      user_id: activity.user_id,
      activity_id: activity.id,
      new_territory_id: null,
      ...event,
    }

    const existing = await TerritoryHistory
      .where('activity_id', '=', activity.id)
      .where('territory_id', '=', parcel.id)
      .where('event_type', '=', event.event_type as string)
      .first()
      .catch(() => null)

    if (existing) {
      await TerritoryHistory.forceUpdate(existing.id, payload)
      return
    }

    await TerritoryHistory.forceCreate(payload)
    // `useTimestamps` overwrites `created_at` on INSERT, so the date the
    // battle actually happened has to be written back after it — otherwise
    // every event on the board is stamped with the moment the seeder ran.
    const created = await TerritoryHistory
      .where('activity_id', '=', activity.id)
      .where('territory_id', '=', parcel.id)
      .where('event_type', '=', event.event_type as string)
      .first()
      .catch(() => null)
    if (created)
      await TerritoryHistory.forceUpdate(created.id, { created_at: payload.created_at })
  }
}
