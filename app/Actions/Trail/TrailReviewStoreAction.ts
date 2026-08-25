// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// POST /api/trails/{id}/reviews (auth) - create or update the session user's
// review of a trail. One review per user per trail (#972 unique index); a
// second submission updates the existing review instead of duplicating it.
// After every write the trail's denormalized rating/review_count are
// recomputed from the review rows (#973), so they can never drift.

import { Auth } from '@stacksjs/auth'

const REVIEW_CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'muddy', 'icy']

export default new Action({
  name: 'Trail Review Store',
  description: 'Create or update the acting user\'s review of a trail',
  method: 'POST',

  async handle(request) {
    const trailId = positiveInt(request.get('id') ?? request.get('trail_id'))
    // Reviewer from the authenticated session (route is behind `auth`); body
    // fallback is for the in-process seed harness only.
    const userId = (await Auth.user().catch(() => null))?.id
    const rating = request.get<number>('rating')
    const content = (request.get<string>('content') ?? '').trim()
    const title = (request.get<string>('title') ?? '').trim() || null
    const conditions = request.get<string>('conditions') ?? null
    const visitDate = request.get<string>('visit_date') ?? null

    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    // Field validation (#977).
    const fields: Record<string, string> = {}
    if (!trailId)
      fields.trail_id = 'required: a positive integer trail id'
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5)
      fields.rating = 'required: an integer from 1 to 5'
    if (content.length < 10 || content.length > 2000)
      fields.content = 'required: 10-2000 characters'
    if (conditions !== null && !REVIEW_CONDITIONS.includes(conditions))
      fields.conditions = `must be one of: ${REVIEW_CONDITIONS.join(', ')}`
    if (Object.keys(fields).length)
      return response.json({ success: false, error: 'Validation failed', fields }, 422)

    try {
      const trail = await Trail.find(trailId)
      if (!trail)
        return response.json({ success: false, error: 'Trail not found' }, 404)

      const fields = {
        rating,
        title,
        content,
        conditions,
        visit_date: visitDate,
      }

      let reviewId: number
      let updated = false
      const existing = await Review
        .where('user_id', '=', userId)
        .where('trail_id', '=', trailId)
        .first()
      if (existing) {
        await Review.forceUpdate(existing.id, fields)
        reviewId = existing.id
        updated = true
      }
      else {
        try {
          const created = await Review.forceCreate({
            user_id: userId,
            trail_id: trailId,
            ...fields,
            helpful_count: 0,
            photos: null,
          })
          reviewId = created.id
        }
        catch (err) {
          // Concurrent double-submit: the unique index (#972) rejected the
          // second insert - update the row the winner created.
          if (!String(err).includes('UNIQUE constraint failed'))
            throw err
          const winner = await Review
            .where('user_id', '=', userId)
            .where('trail_id', '=', trailId)
            .first()
          if (!winner)
            throw err
          await Review.forceUpdate(winner.id, fields)
          reviewId = winner.id
          updated = true
        }
      }

      // After-write hook (#973): rebuild this trail's aggregates from rows.
      const trailReviews = (await Review.where('trail_id', '=', trailId).get()) ?? []
      const reviewCount = trailReviews.length
      const avgRating = reviewCount
        ? Math.round(trailReviews.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) / reviewCount * 10) / 10
        : 0
      await Trail.forceUpdate(trailId, { rating: avgRating, review_count: reviewCount })

      const user = await User.find(userId)
      return response.json({
        success: true,
        updated,
        review: {
          id: reviewId,
          userId,
          userName: user?.name ?? 'Unknown',
          trailId,
          rating,
          title,
          content,
          conditions,
          visitDate,
        },
        trail: { id: trailId, rating: avgRating, reviewCount },
      }, updated ? 200 : 201)
    }
    catch (error) {
      console.error('[trails] review store failed:', error)
      return response.json({ success: false, error: 'Failed to save review' }, 500)
    }
  },
})
