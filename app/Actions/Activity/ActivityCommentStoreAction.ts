// No imports needed - everything is auto-imported!
//
// POST /api/activities/{id}/comments — add a comment to an activity. The author
// is taken from the body for now (auth hardening tracked in #939).

export default new Action({
  name: 'Activity Comment Store',
  description: 'Add a comment to an activity',
  method: 'POST',

  async handle(request) {
    const activityId = request.get<number>('id') ?? request.get<number>('activity_id')
    // Author from the authenticated session (route is behind `auth`); body
    // fallback is for the in-process harness only.
    const userId = (await Auth.user().catch(() => null))?.id ?? request.get<number>('user_id')
    const body = (request.get<string>('body') ?? '').trim()

    if (!activityId)
      return response.json({ success: false, error: 'Activity ID is required' }, 400)
    if (!userId)
      return response.json({ success: false, error: 'User ID is required' }, 400)
    if (!body)
      return response.json({ success: false, error: 'Comment text is required' }, 400)

    try {
      const activity = await Activity.find(activityId)
      if (!activity)
        return response.json({ success: false, error: 'Activity not found' }, 404)

      const comment = await ActivityComment.forceCreate({
        user_id: userId,
        activity_id: activityId,
        body: body.slice(0, 2000),
      })

      const user = await User.find(userId)

      return response.json({
        success: true,
        comment: {
          id: comment.id,
          userId,
          userName: user?.name ?? 'Unknown',
          body: comment.body,
          createdAt: comment.created_at,
        },
      }, 201)
    }
    catch (error) {
      console.error('Error creating comment:', error)
      return response.json({ success: false, error: 'Failed to add comment' }, 500)
    }
  },
})
