import { Seeder } from '@stacksjs/database'
import { computeCounterFixes } from '../../resources/functions/counters'
import Activity from '../../app/Models/Activity'
import Kudos from '../../app/Models/Kudos'
import Review from '../../app/Models/Review'
import Trail from '../../app/Models/Trail'

/**
 * Reconcile the denormalized counters at the end of a seed.
 *
 * `activities.kudos_count`, `trails.rating` and `trails.review_count` are
 * caches over the kudos and trail_reviews tables. The write paths keep them in
 * step per row (KudosToggleAction, TrailReviewStoreAction) and this is the
 * drift repair — the same sweep behind `buddy counters:recompute` and
 * POST /api/maintenance/recompute-counters, folded through exactly the same
 * pure function.
 *
 * Running it last is what lets every other seeder leave these columns alone.
 * A seeder that writes a rating next to a review, or a kudos count next to a
 * run, is asserting a number the rows behind it may not support — and a star
 * rating that disagrees with its own reviews is indistinguishable from a
 * broken average.
 */
export default class CounterSeeder extends Seeder {
  // Last. Everything it counts has to exist first.
  static order = 100

  async run(): Promise<void> {
    const [activities, kudos, trails, reviews] = await Promise.all([
      Activity.all().catch(() => []),
      Kudos.all().catch(() => []),
      Trail.all().catch(() => []),
      Review.all().catch(() => []),
    ])

    const fixes = computeCounterFixes({
      activities: activities as any[],
      kudos: kudos as any[],
      trails: trails as any[],
      reviews: reviews as any[],
    })

    for (const fix of fixes.activityFixes)
      await Activity.forceUpdate(fix.id, { kudos_count: fix.kudos_count })

    for (const fix of fixes.trailFixes)
      await Trail.forceUpdate(fix.id, { rating: fix.rating, review_count: fix.review_count })

    console.warn(`[seed] counters reconciled: ${fixes.activityFixes.length} activities, ${fixes.trailFixes.length} trails`)
  }
}
