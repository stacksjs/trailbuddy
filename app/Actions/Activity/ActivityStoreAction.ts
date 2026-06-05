// No imports needed - everything is auto-imported!
//
// Persists a recorded run as an Activity row. The recorder POSTs a GPS track
// (GeoJSON LineString / JSON coords) in `gpx_data`; that payload is what the
// territory engine (claim / process-conquest) later reads. Snake_case keys
// match the ORM's column-based attributes.

const ACTIVITY_TYPES = ['Trail Run', 'Hike', 'Walk', 'Bike']

export default new Action({
  name: 'Activity Store',
  description: 'Create an activity (a recorded run/hike) with its GPS track',
  method: 'POST',

  async handle(request) {
    const userId = request.get<number>('user_id')
    const activityType = request.get<string>('activity_type') || 'Trail Run'
    const distance = request.get<number>('distance')
    const duration = request.get<string>('duration')

    if (!userId)
      return response.json({ success: false, error: 'User ID is required' }, 400)
    if (distance === undefined || distance === null)
      return response.json({ success: false, error: 'Distance is required' }, 400)
    if (!duration)
      return response.json({ success: false, error: 'Duration is required' }, 400)
    if (!ACTIVITY_TYPES.includes(activityType))
      return response.json({ success: false, error: `Invalid activity type: ${activityType}` }, 400)

    try {
      const activity = await Activity.create({
        user_id: userId,
        trail_id: request.get<number>('trail_id') ?? null,
        activity_type: activityType,
        distance,
        duration,
        pace: request.get<string>('pace') ?? null,
        elevation: request.get<number>('elevation') ?? 0,
        kudos_count: 0,
        notes: request.get<string>('notes') ?? null,
        gpx_data: request.get<string>('gpx_data') ?? null,
        completed_at: request.get<string>('completed_at') ?? new Date().toISOString(),
      })

      return response.json({
        success: true,
        activity: {
          id: activity.id,
          userId: activity.user_id,
          trailId: activity.trail_id,
          activityType: activity.activity_type,
          distance: activity.distance,
          duration: activity.duration,
          pace: activity.pace,
          elevation: activity.elevation,
          completedAt: activity.completed_at,
          hasGps: !!activity.gpx_data,
        },
      }, 201)
    }
    catch (error) {
      console.error('Error creating activity:', error)
      return response.json({ success: false, error: 'Failed to create activity' }, 500)
    }
  },
})
