// No imports needed - everything is auto-imported!
//
// GET /api/trails/{id}/reviews — a trail's reviews with author names joined
// (#981). Public read; the trail detail Reviews tab renders straight from
// this (newest first).

export default new Action({
  name: 'Trail Review Index',
  description: 'List a trail\'s reviews with author names',
  method: 'GET',

  async handle(request) {
    const trailId = positiveInt(request.get('id') ?? request.get('trail_id'))
    if (!trailId)
      return response.json({ success: false, error: 'Validation failed', fields: { trail_id: 'required: a positive integer trail id' } }, 422)

    try {
      const rows = (await Review
        .where('trail_id', '=', trailId)
        .orderBy('created_at', 'desc')
        .get()) ?? []

      const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))]
      const users = userIds.length ? await User.whereIn('id', userIds).get() : []
      const userName = new Map(users.map((u: any) => [u.id, u.name]))

      const reviews = rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: userName.get(r.user_id) ?? 'Unknown',
        rating: r.rating ?? 0,
        title: r.title,
        content: r.content,
        conditions: r.conditions,
        visitDate: r.visit_date,
        createdAt: r.created_at,
      }))

      return response.json({ success: true, reviews, meta: { total: reviews.length } })
    }
    catch (error) {
      console.error('[trail-reviews] index failed:', error)
      return response.json({ success: false, error: 'Failed to fetch reviews' }, 500)
    }
  },
})
