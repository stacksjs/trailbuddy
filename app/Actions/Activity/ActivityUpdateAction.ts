// No imports needed - everything is auto-imported!
//
// PATCH /api/activities/{id} — owner edits an activity. Descriptive fields
// (type, notes, trail) are always editable; measured fields (distance,
// duration, moving_time, pace, elevation, completed_at) only on manual
// entries (no gpx_data) — a GPS-recorded run's numbers are locked so an edit
// can't retroactively alter a track that claimed or conquered territory.

const ACTIVITY_TYPES = ['Trail Run', 'Hike', 'Walk', 'Bike']
const MEASURED_FIELDS = ['distance', 'duration', 'moving_time', 'pace', 'elevation', 'completed_at']

export default new Action({
  name: 'Activity Update',
  description: 'Edit an activity (owner only; measured fields locked on GPS runs)',
  method: 'PATCH',

  async handle(request) {
    const id = positiveInt(request.get('id'))
    // Owner from the authenticated session (route is behind `auth`); body
    // fallback is for the in-process seed harness only.
    const userId = (await Auth.user().catch(() => null))?.id ?? positiveInt(request.get('user_id'))

    if (!id)
      return response.json({ success: false, error: 'Validation failed', fields: { id: 'required: a positive integer activity id' } }, 422)
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    try {
      const activity = await Activity.find(id)
      if (!activity)
        return response.json({ success: false, error: 'Activity not found' }, 404)
      if (activity.user_id !== userId)
        return response.json({ success: false, error: 'You can only edit your own activities' }, 403)

      const updates: Record<string, unknown> = {}

      const activityType = request.get<string>('activity_type')
      if (activityType !== undefined && activityType !== null) {
        if (!ACTIVITY_TYPES.includes(activityType))
          return response.json({ success: false, error: `Invalid activity type: ${activityType}` }, 422)
        updates.activity_type = activityType
      }

      const notes = request.get<string>('notes')
      if (notes !== undefined)
        updates.notes = notes

      const trailId = request.get<number | null>('trail_id')
      if (trailId !== undefined)
        updates.trail_id = trailId

      // Measured fields: reject outright on GPS runs instead of silently
      // dropping them, so the client knows the edit didn't take.
      const measured = MEASURED_FIELDS.filter(f => request.get(f) !== undefined && request.get(f) !== null)
      if (measured.length > 0 && activity.gpx_data) {
        return response.json({
          success: false,
          error: `Locked for GPS-recorded activities: ${measured.join(', ')}`,
        }, 422)
      }
      for (const field of measured) {
        const value = request.get(field)
        if ((field === 'distance' || field === 'elevation') && (typeof value !== 'number' || value < 0))
          return response.json({ success: false, error: `${field} must be a non-negative number` }, 422)
        updates[field] = value
      }

      if (Object.keys(updates).length === 0)
        return response.json({ success: false, error: 'No editable fields provided' }, 422)

      await Activity.forceUpdate(id, updates)
      const updated = await Activity.find(id)

      return response.json({
        success: true,
        activity: {
          id: updated.id,
          userId: updated.user_id,
          trailId: updated.trail_id,
          activityType: updated.activity_type,
          distance: updated.distance,
          duration: updated.duration,
          movingTime: updated.moving_time ?? updated.duration,
          pace: updated.pace,
          elevation: updated.elevation,
          notes: updated.notes,
          completedAt: updated.completed_at,
          hasGps: !!updated.gpx_data,
        },
      })
    }
    catch (error) {
      console.error('[activities] update failed:', error)
      return response.json({ success: false, error: 'Failed to update activity' }, 500)
    }
  },
})
