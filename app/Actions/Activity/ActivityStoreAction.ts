// No imports needed - everything is auto-imported!
//
// Persists a recorded run as an Activity row. The recorder POSTs a GPS track
// (GeoJSON LineString / JSON coords) in `gpx_data`; that payload is what the
// territory engine (claim / process-conquest) later reads. Snake_case keys
// match the ORM's column-based attributes.
import { evaluateAchievementsForUser } from '../Achievement/EvaluateAchievementsAction'

const ACTIVITY_TYPES = ['Trail Run', 'Hike', 'Walk', 'Bike']
const VISIBILITIES = ['public', 'followers', 'private']

export default new Action({
  name: 'Activity Store',
  description: 'Create an activity (a recorded run/hike) with its GPS track',
  method: 'POST',

  async handle(request) {
    // Owner from the authenticated session (route is behind `auth`); body
    // fallback is for the in-process seed harness only.
    const userId = (await Auth.user().catch(() => null))?.id ?? positiveInt(request.get('user_id'))
    const activityType = request.get<string>('activity_type') || 'Trail Run'
    const distance = boundedNumber(request.get('distance'), 0, 1000)
    const duration = durationString(request.get('duration'))

    // Field validation (#977): malformed input → 422 with a field-keyed map.
    const fields: Record<string, string> = {}
    if (!userId)
      fields.user_id = 'required: authenticated session (or user_id in the harness)'
    if (!ACTIVITY_TYPES.includes(activityType))
      fields.activity_type = `must be one of: ${ACTIVITY_TYPES.join(', ')}`
    if (distance === null)
      fields.distance = 'required: miles as a number between 0 and 1000'
    if (duration === null)
      fields.duration = 'required: a MM:SS or H:MM:SS duration'

    const movingTime = request.get('moving_time')
    if (movingTime !== undefined && movingTime !== null && durationString(movingTime) === null)
      fields.moving_time = 'must be a MM:SS or H:MM:SS duration'
    const elevationRaw = request.get('elevation')
    const elevation = elevationRaw === undefined || elevationRaw === null ? 0 : boundedNumber(elevationRaw, 0, 100000)
    if (elevation === null)
      fields.elevation = 'must be feet as a number between 0 and 100000'
    const trailIdRaw = request.get('trail_id')
    const trailId = trailIdRaw === undefined || trailIdRaw === null ? null : positiveInt(trailIdRaw)
    if (trailIdRaw !== undefined && trailIdRaw !== null && trailId === null)
      fields.trail_id = 'must be a positive integer trail id'
    const gpxData = request.get('gpx_data')
    if (gpxData !== undefined && gpxData !== null && (typeof gpxData !== 'string' || gpxData.length > 2_000_000))
      fields.gpx_data = 'must be a GeoJSON/JSON string under 2MB'
    const completedAt = request.get('completed_at')
    if (completedAt !== undefined && completedAt !== null && (typeof completedAt !== 'string' || Number.isNaN(Date.parse(completedAt))))
      fields.completed_at = 'must be a parseable date string'
    const visibility = request.get<string>('visibility') ?? 'public'
    if (!VISIBILITIES.includes(visibility))
      fields.visibility = `must be one of: ${VISIBILITIES.join(', ')}`

    if (Object.keys(fields).length)
      return response.json({ success: false, error: 'Validation failed', fields }, 422)

    // Splits arrive as an array of { mile, pace, elev } (or a pre-encoded JSON
    // string); store as JSON text. Cap the count to keep payloads sane.
    const rawSplits = request.get<unknown>('splits')
    let splitsJson: string | null = null
    if (Array.isArray(rawSplits) && rawSplits.length > 0)
      splitsJson = JSON.stringify(rawSplits.slice(0, 200))
    else if (typeof rawSplits === 'string' && rawSplits.startsWith('['))
      splitsJson = rawSplits

    try {
      const activity = await Activity.create({
        user_id: userId,
        trail_id: trailId,
        activity_type: activityType,
        distance,
        duration,
        moving_time: durationString(movingTime) ?? null,
        pace: request.get<string>('pace') ?? null,
        elevation,
        kudos_count: 0,
        notes: request.get<string>('notes') ?? null,
        gpx_data: (gpxData as string | undefined) ?? null,
        splits: splitsJson,
        visibility,
        completed_at: (completedAt as string | undefined) ?? new Date().toISOString(),
      })

      // Unlock engine hook (#982) — best-effort, never blocks the store.
      await evaluateAchievementsForUser(userId).catch((err: unknown) =>
        console.error('[achievements] evaluate after activity failed:', err))

      return response.json({
        success: true,
        activity: {
          id: activity.id,
          userId: activity.user_id,
          trailId: activity.trail_id,
          activityType: activity.activity_type,
          distance: activity.distance,
          duration: activity.duration,
          movingTime: activity.moving_time,
          pace: activity.pace,
          elevation: activity.elevation,
          completedAt: activity.completed_at,
          visibility: activity.visibility ?? 'public',
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
