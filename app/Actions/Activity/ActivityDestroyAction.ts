// No imports needed - everything is auto-imported!
//
// DELETE /api/activities/{id} - owner deletes an activity. Social children
// (kudos, comments) go with it; territory rows that reference the activity
// keep the land but lose their provenance pointer - conquered ground is NOT
// un-conquered by deleting the run that took it, and history rows stay as an
// (unlinked) audit trail. References are cleared before the parent row is
// removed so the inline FKs can never trip.

export default new Action({
  name: 'Activity Destroy',
  description: 'Delete an activity (owner only; cascades kudos/comments, keeps territory)',
  method: 'DELETE',

  async handle(request) {
    const id = positiveInt(request.get('id'))
    // Owner from the authenticated session (route is behind `auth`); body
    // fallback is for the in-process seed harness only.
    const userId = (await Auth.user().catch(() => null))?.id

    if (!id)
      return response.json({ success: false, error: 'Validation failed', fields: { id: 'required: a positive integer activity id' } }, 422)
    if (!userId)
      return response.json({ success: false, error: 'Authentication required' }, 401)

    try {
      const activity = await Activity.find(id)
      if (!activity)
        return response.json({ success: false, error: 'Activity not found' }, 404)
      if (activity.user_id !== userId)
        return response.json({ success: false, error: 'You can only delete your own activities' }, 403)

      const territories = (await Territory.where('activity_id', '=', id).get()) ?? []
      for (const t of territories)
        await Territory.forceUpdate(t.id, { activity_id: null })

      const historyRows = (await TerritoryHistory.where('activity_id', '=', id).get()) ?? []
      for (const h of historyRows)
        await TerritoryHistory.forceUpdate(h.id, { activity_id: null })

      const kudosRows = (await Kudos.where('activity_id', '=', id).get()) ?? []
      for (const k of kudosRows)
        await Kudos.delete(k.id)

      const commentRows = (await ActivityComment.where('activity_id', '=', id).get()) ?? []
      for (const c of commentRows)
        await ActivityComment.delete(c.id)

      await Activity.delete(id)

      return response.json({
        success: true,
        deleted: {
          id,
          kudos: kudosRows.length,
          comments: commentRows.length,
          territoriesUnlinked: territories.length,
          historyUnlinked: historyRows.length,
        },
      })
    }
    catch (error) {
      console.error('[activities] destroy failed:', error)
      return response.json({ success: false, error: 'Failed to delete activity' }, 500)
    }
  },
})
