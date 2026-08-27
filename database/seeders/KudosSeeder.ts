import { Seeder } from '@stacksjs/database'
import Activity from '../../app/Models/Activity'
import Follow from '../../app/Models/Follow'
import Kudos from '../../app/Models/Kudos'

/**
 * Kudos on the seeded feed.
 *
 * The feed's kudos button renders from these rows, `activities.kudos_count` is
 * a count of them, and the `kudos_given` achievement is the only social metric
 * the unlock engine tracks — with the table empty all three read zero and none
 * of them can be told apart from a broken query.
 *
 * Who gives kudos to what is derived rather than listed: an athlete gives
 * kudos to the activities of the people they follow. That is what the button
 * on a feed actually is — the feed shows you the people you follow — so the
 * rows here are a consequence of FollowSeeder's graph rather than a second,
 * independent story that could contradict it.
 *
 * `kudos_count` is deliberately not written here. It is denormalized over this
 * table and CounterSeeder recomputes it with the same function
 * `buddy counters:recompute` uses.
 *
 * Idempotent on (giver, activity), the table's own unique index.
 */
export default class KudosSeeder extends Seeder {
  // After FollowSeeder (-66): the graph decides who gives kudos to whom.
  static order = -64

  async run(): Promise<void> {
    const follows = (await Follow.all().catch(() => [])) as any[]
    if (!follows.length) {
      console.warn('[seed] no follows yet; skipping kudos')
      return
    }

    const activities = (await Activity.all().catch(() => [])) as any[]
    const byUser = new Map<number, any[]>()
    for (const activity of activities) {
      // A private activity is not on anybody else's feed, so it cannot collect
      // kudos from one.
      if (activity.visibility === 'private')
        continue
      const list = byUser.get(activity.user_id) ?? []
      list.push(activity)
      byUser.set(activity.user_id, list)
    }

    for (const follow of follows) {
      for (const activity of byUser.get(follow.following_id) ?? []) {
        const existing = await Kudos
          .where('giver_id', '=', follow.follower_id)
          .where('activity_id', '=', activity.id)
          .first()
          .catch(() => null)

        if (existing)
          continue

        await Kudos.forceCreate({
          giver_id: follow.follower_id,
          // The recipient, denormalized on the row so a notification does not
          // need to join back through the activity.
          user_id: activity.user_id,
          activity_id: activity.id,
        })
      }
    }
  }
}
