// No imports needed - everything is auto-imported!
//
// POST /api/activities/{id}/kudos — toggles the requesting user's kudos on an
// activity (idempotent: add if absent, remove if present), then recomputes the
// denormalized activities.kudos_count from the kudos rows. The giver is taken
// from the body for now (auth hardening tracked in #939).

export default new Action({
  name: 'Toggle Kudos',
  description: 'Give or remove kudos on an activity',
  method: 'POST',

  async handle(request) {
    const activityId = request.get<number>('id') ?? request.get<number>('activity_id')
    // Giver from the authenticated session (route is behind `auth`); body
    // fallback is for the in-process harness only.
    const giverId = (await Auth.user().catch(() => null))?.id
      ?? request.get<number>('user_id') ?? request.get<number>('giver_id')

    if (!activityId)
      return response.json({ success: false, error: 'Activity ID is required' }, 400)
    if (!giverId)
      return response.json({ success: false, error: 'User ID is required' }, 400)

    try {
      const activity = await Activity.find(activityId)
      if (!activity)
        return response.json({ success: false, error: 'Activity not found' }, 404)

      const existing = await Kudos
        .where('giver_id', '=', giverId)
        .where('activity_id', '=', activityId)
        .first()

      let kudosed: boolean
      if (existing) {
        await Kudos.delete(existing.id)
        kudosed = false
      }
      else {
        await Kudos.forceCreate({
          giver_id: giverId,
          user_id: activity.user_id,
          activity_id: activityId,
        })
        kudosed = true
      }

      // Recompute the denormalized counter from the source of truth.
      const all = await Kudos.where('activity_id', '=', activityId).get()
      const kudosCount = (all ?? []).length
      await Activity.forceUpdate(activityId, { kudos_count: kudosCount })

      return response.json({ success: true, kudosed, kudosCount })
    }
    catch (error) {
      console.error('Error toggling kudos:', error)
      return response.json({ success: false, error: 'Failed to toggle kudos' }, 500)
    }
  },
})
