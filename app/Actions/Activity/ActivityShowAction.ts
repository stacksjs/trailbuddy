// No imports needed - everything is auto-imported!
//
// Returns a single activity with its parsed GPS route (for the activity detail
// page / map). The ORM is snake_case; the response is mapped to camelCase.

export default new Action({
  name: 'Activity Show',
  description: 'Get a single activity, including its GPS route',
  method: 'GET',

  async handle(request) {
    const id = request.get<number>('id')
    if (!id)
      return response.json({ success: false, error: 'Activity ID is required' }, 400)

    try {
      const a = await Activity.find(id)
      if (!a)
        return response.json({ success: false, error: 'Activity not found' }, 404)

      // gpx_data is a GeoJSON LineString / JSON coords string; parse to [{lat,lng}].
      const route = a.gpx_data ? parseGpsData(a.gpx_data) : []

      return response.json({
        success: true,
        activity: {
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
          route,
        },
      })
    }
    catch (error) {
      console.error('[activities] show failed:', error)
      return response.json({ success: false, error: 'Failed to fetch activity' }, 500)
    }
  },
})
