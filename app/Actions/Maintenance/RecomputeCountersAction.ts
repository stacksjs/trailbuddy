// No imports needed - everything is auto-imported!
//
// POST /api/maintenance/recompute-counters (auth) - recomputes every
// denormalized counter from its source-of-truth rows (#973):
//   activities.kudos_count   ← kudos
//   trails.rating            ← avg(trail_reviews.rating), 1 decimal
//   trails.review_count      ← count(trail_reviews)
// The math lives in resources/functions/counters.ts. Write paths keep these
// in sync per-row (KudosToggleAction, TrailReviewStoreAction); this sweep is
// the drift repair for seeds/manual edits, also exposed as
// `buddy counters:recompute`.

export async function recomputeDenormalizedCounters(): Promise<{
  activitiesFixed: number
  trailsFixed: number
  activitiesTotal: number
  trailsTotal: number
}> {
  const activities = (await Activity.all()) ?? []
  const kudos = (await Kudos.all()) ?? []
  const trails = (await Trail.all()) ?? []
  const reviews = (await Review.all()) ?? []

  const fixes = computeCounterFixes({ activities, kudos, trails, reviews })

  for (const f of fixes.activityFixes)
    await Activity.forceUpdate(f.id, { kudos_count: f.kudos_count })
  for (const f of fixes.trailFixes)
    await Trail.forceUpdate(f.id, { rating: f.rating, review_count: f.review_count })

  return {
    activitiesFixed: fixes.activityFixes.length,
    trailsFixed: fixes.trailFixes.length,
    activitiesTotal: activities.length,
    trailsTotal: trails.length,
  }
}

export default new Action({
  name: 'Recompute Counters',
  description: 'Recompute denormalized counters (kudos_count, trail rating/review_count)',
  method: 'POST',

  async handle() {
    try {
      const result = await recomputeDenormalizedCounters()
      return response.json({ success: true, ...result })
    }
    catch (error) {
      console.error('Error recomputing counters:', error)
      return response.json({ success: false, error: 'Failed to recompute counters' }, 500)
    }
  },
})
