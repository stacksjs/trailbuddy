import { Seeder } from '@stacksjs/database'
import Activity from '../../app/Models/Activity'
import User from '../../app/Models/User'

/**
 * Activities for the seeded athletes.
 *
 * This used to be `factory.generate(Activity, { count: 50 })` — fifty rows of
 * faker output whose `user_id` pointed at nobody in particular. The feed, the
 * athletes directory and the leaderboard are all activity-driven, so the
 * result was a leaderboard ranking users who did not exist and an athletes
 * page that showed "No athletes" because none of the seeded people had
 * anything attached to them.
 *
 * These are attached to the named athletes, with distances and paces that
 * agree with the totals in UserSeeder, so the leaderboard sorts into the order
 * those numbers imply. A ranking is the one screen where plausible-but-random
 * data is actively misleading: you cannot tell a sorting bug from the data.
 *
 * Dates walk backwards from today, so a staging database always has a feed
 * with something recent in it.
 */

const DAY = 24 * 60 * 60 * 1000

interface Session {
  type: 'Trail Run' | 'Hike' | 'Walk' | 'Bike'
  distance: number
  minutes: number
  elevation: number
  notes: string
}

/** Per athlete, most recent first. */
const SESSIONS: Record<string, Session[]> = {
  'Harvey Lewis': [
    { type: 'Trail Run', distance: 41.7, minutes: 600, elevation: 3200, notes: 'Ten yards before the heat came up. Legs fine, stomach better.' },
    { type: 'Trail Run', distance: 12.4, minutes: 96, elevation: 890, notes: 'Easy shakeout on the loop.' },
    { type: 'Trail Run', distance: 26.2, minutes: 232, elevation: 1740, notes: 'Long effort, held pace through the back half.' },
    { type: 'Hike', distance: 6.1, minutes: 118, elevation: 1450, notes: 'Recovery hike, deliberately slow.' },
  ],
  'Pawel Dregan': [
    { type: 'Trail Run', distance: 18.6, minutes: 152, elevation: 2100, notes: 'Ridge line out and back. Wind on the exposed section.' },
    { type: 'Trail Run', distance: 9.4, minutes: 71, elevation: 640, notes: 'Tempo on the fire road.' },
    { type: 'Bike', distance: 34.2, minutes: 118, elevation: 1980, notes: 'Cross-training, kept it aerobic.' },
  ],
  'Chris Breuer': [
    { type: 'Trail Run', distance: 7.8, minutes: 63, elevation: 720, notes: 'Morning loop before work.' },
    { type: 'Hike', distance: 11.2, minutes: 214, elevation: 2650, notes: 'Summit push with the dog. Cold at the top.' },
    { type: 'Trail Run', distance: 13.1, minutes: 108, elevation: 1130, notes: 'Half distance, negative split.' },
  ],
  'Kim Gottwald': [
    { type: 'Trail Run', distance: 10.5, minutes: 88, elevation: 980, notes: 'Forest singletrack, soft underfoot after the rain.' },
    { type: 'Walk', distance: 4.2, minutes: 62, elevation: 180, notes: 'Easy day.' },
    { type: 'Trail Run', distance: 15.8, minutes: 139, elevation: 1620, notes: 'Long run with the club.' },
  ],
  'Mark Dowdle': [
    { type: 'Trail Run', distance: 8.9, minutes: 74, elevation: 810, notes: 'Steady, felt good.' },
    { type: 'Hike', distance: 9.6, minutes: 186, elevation: 2240, notes: 'Ridge traverse. Longer than it looked on the map.' },
  ],
}

/** `h:mm:ss`, which is what the UI formats from. */
function duration(minutes: number): string {
  const total = Math.round(minutes * 60)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** `m:ss` per mile, derived so it always agrees with distance and time. */
function pace(minutes: number, distance: number): string {
  if (distance <= 0)
    return '0:00'
  const perMile = minutes / distance
  const m = Math.floor(perMile)
  const s = Math.round((perMile - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default class ActivitySeeder extends Seeder {
  // After UserSeeder: every activity belongs to one of its athletes.
  static order = -85

  async run(): Promise<void> {
    const users = await User.all().catch(() => [])
    const byName = new Map((users as any[]).map(u => [u.name, u]))
    if (byName.size === 0) {
      console.warn('[seed] no users yet; skipping activities')
      return
    }

    const now = Date.now()

    for (const [name, sessions] of Object.entries(SESSIONS)) {
      const user = byName.get(name)
      if (!user)
        continue

      /*
       * Each athlete's days start over at 1 rather than continuing a running
       * count across everybody.
       *
       * A shared counter pushed the fifteen sessions across fifteen days, and
       * the leaderboard's default window is WEEKLY — so only the two athletes
       * seeded first landed inside it and the board showed two names out of
       * five. Per-athlete offsets keep every session inside the last four
       * days, which is also what a real week of training looks like.
       */
      let dayOffset = 0

      for (const session of sessions) {
        dayOffset += 1
        const completedAt = new Date(now - dayOffset * DAY).toISOString()

        // Idempotent per athlete + note, so re-seeding refreshes the dates
        // rather than stacking another copy of the same run onto the feed.
        const existing = await Activity
          .where('user_id', '=', user.id)
          .where('notes', '=', session.notes)
          .first()
          .catch(() => null)

        const payload = {
          user_id: user.id,
          trail_id: null,
          activity_type: session.type,
          distance: session.distance,
          duration: duration(session.minutes),
          moving_time: duration(session.minutes),
          pace: pace(session.minutes, session.distance),
          elevation: session.elevation,
          kudos_count: Math.round(session.distance * 2.4),
          notes: session.notes,
          visibility: 'public' as const,
          completed_at: completedAt,
        }

        if (existing)
          await Activity.update(existing.id, payload)
        else
          await Activity.forceCreate(payload)
      }
    }
  }
}
