import { Seeder } from '@stacksjs/database'
import { computeTerritoryRankAssignments } from '../../resources/functions/ranks'
import { XP_REWARDS } from '../../resources/functions/xp'
import Territory from '../../app/Models/Territory'
import TerritoryHistory from '../../app/Models/TerritoryHistory'
import TerritoryStats from '../../app/Models/TerritoryStats'
import User from '../../app/Models/User'

/**
 * Every athlete's standing in the territory game.
 *
 * This used to be `factory.generate(TerritoryStats, { count: 20 })`: twenty
 * rows of `faker.number.int` for territories owned, area held, conquests,
 * defences, XP and rank. Not one of them was reachable from the territories
 * table, so the leaderboard ranked an empire nobody could open, a profile
 * claimed conquests with no conquest behind them, and the numbers went on
 * disagreeing with the map no matter what the map did. It stopped working
 * when `factory` was removed from @stacksjs/database.
 *
 * This table is a cache, not a source. Every column on it is a fold over the
 * territories a user holds and the history rows they appear in, and the write
 * paths (ClaimTerritoryAction, ProcessActivityConquestAction) maintain it
 * incrementally as those events happen. So the seeder recomputes it from
 * scratch rather than inventing it — the same relationship
 * `buddy counters:recompute` has to the denormalized counters, and the reason
 * a seeded number can never drift from the board it describes.
 *
 * XP is folded from the same events using the game's own award table, and the
 * two ranks come from `computeTerritoryRankAssignments`, which is the function
 * the ranking action and the cron command both call.
 */

const SECONDS_PER_DAY = 86400

export default class TerritoryStatsSeeder extends Seeder {
  // Last of the territory seeders: it reads the finished board.
  static override order = -76

  async run(): Promise<void> {
    const users = (await User.all().catch(() => [])) as any[]
    if (!users.length) {
      console.warn('[seed] no users; skipping territory stats')
      return
    }

    const territories = (await Territory.all().catch(() => [])) as any[]
    const history = (await TerritoryHistory.all().catch(() => [])) as any[]
    const now = Date.now()

    for (const user of users) {
      // Expired land is off the map and no longer counts towards an empire.
      const held = territories.filter(t => t.user_id === user.id && t.status !== 'expired')
      const claimed = history.filter(h => h.user_id === user.id && h.event_type === 'claimed')
      const conquered = history.filter(h => h.user_id === user.id && h.event_type === 'conquered')
      const defended = history.filter(h => h.user_id === user.id && h.event_type === 'defended')
      const lost = history.filter(h => h.previous_owner_id === user.id && h.event_type === 'conquered')

      const totalArea = held.reduce((sum, t) => sum + (t.area_size ?? 0), 0)

      // The longest single stretch this user has held one parcel: still-held
      // land measured to now, land they lost measured to the moment it went.
      const ownershipDays = [
        ...held.map(t => t.claimed_at ? (now - new Date(t.claimed_at).getTime()) / 1000 : 0),
        ...lost.map(h => h.previous_ownership_duration ?? 0),
      ]

      const xp = claimed.reduce((sum, h) => sum + XP_REWARDS.claim(h.area_at_event ?? 0), 0)
        + conquered.reduce((sum, h) => sum + XP_REWARDS.conquest(h.area_at_event ?? 0), 0)
        + defended.length * XP_REWARDS.defend()

      const payload = {
        user_id: user.id,
        total_territories_owned: held.length,
        total_area_owned: Math.round(totalArea * 100) / 100,
        territories_claimed: claimed.length,
        territories_conquered: conquered.length,
        territories_lost: lost.length,
        territories_defended: defended.length,
        longest_ownership_days: Math.floor(Math.max(0, ...ownershipDays) / SECONDS_PER_DAY),
        largest_territory_area: Math.round(Math.max(0, ...held.map(t => t.area_size ?? 0)) * 100) / 100,
        xp,
        // Filled in below, once every row exists to be ranked against.
        weekly_rank: null,
        all_time_rank: null,
      }

      // One row per user is the table's own unique index, so re-seeding
      // refreshes the standing rather than adding a second one.
      const existing = await TerritoryStats.where('user_id', '=', user.id).first().catch(() => null)
      if (existing)
        await TerritoryStats.forceUpdate(existing.id, payload)
      else
        await TerritoryStats.forceCreate(payload)
    }

    // Ranks are ordinal over the whole field, so they can only be assigned
    // once every row is written. This is the same call the ranking action and
    // `buddy territory:ranks` make.
    const stats = (await TerritoryStats.all().catch(() => [])) as any[]
    const gains = history.filter(h => h.event_type === 'claimed' || h.event_type === 'conquered')
    for (const assignment of computeTerritoryRankAssignments(stats, gains)) {
      await TerritoryStats.forceUpdate(assignment.id, {
        weekly_rank: assignment.weekly_rank,
        all_time_rank: assignment.all_time_rank,
      })
    }
  }
}
