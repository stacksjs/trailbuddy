// No imports needed - everything is auto-imported!
//
// Lists activities for the feed / profile. Optional ?user_id filter. The ORM is
// snake_case; the response is mapped to camelCase for the frontend.

export default new Action({
  name: 'Activity Index',
  description: 'List activities (optionally filtered by user) for the feed',
  method: 'GET',

  async handle(request) {
    const userId = request.get<number>('user_id')
    const limit = Math.min(Math.max(request.get<number>('limit') || 100, 1), 500)

    try {
      const query = userId
        ? Activity.where('user_id', '=', userId)
        : Activity.query()
      const rows = await query.orderBy('created_at', 'desc').limit(limit).get()

      const activities = (rows ?? []).map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        trailId: a.trail_id,
        activityType: a.activity_type,
        distance: a.distance,
        duration: a.duration,
        pace: a.pace,
        elevation: a.elevation,
        kudosCount: a.kudos_count ?? 0,
        notes: a.notes,
        completedAt: a.completed_at,
        createdAt: a.created_at,
      }))

      return response.json({ activities, meta: { total: activities.length } })
    }
    catch (error) {
      console.error('[activities] index failed:', error)
      return response.json({ activities: [], error: 'Failed to fetch activities' }, 500)
    }
  },
})
