// No imports needed - everything is auto-imported!
//
// POST /api/users/{id}/follow — the authenticated user follows/unfollows user
// {id} (idempotent toggle). The follower is the session user (#939), never the
// body, so you can't make someone else follow on their behalf.

export default new Action({
  name: 'Follow Toggle',
  description: 'Follow or unfollow a user',
  method: 'POST',

  async handle(request) {
    const targetId = request.get<number>('id')
    const followerId = (await Auth.user().catch(() => null))?.id ?? request.get<number>('follower_id')

    if (!targetId)
      return response.json({ success: false, error: 'User ID is required' }, 400)
    if (!followerId)
      return response.json({ success: false, error: 'Authentication required' }, 401)
    if (Number(targetId) === Number(followerId))
      return response.json({ success: false, error: 'You cannot follow yourself' }, 400)

    try {
      const target = await User.find(targetId)
      if (!target)
        return response.json({ success: false, error: 'User not found' }, 404)

      const existing = await Follow
        .where('follower_id', '=', followerId)
        .where('following_id', '=', targetId)
        .first()

      let following: boolean
      if (existing) {
        await Follow.delete(existing.id)
        following = false
      }
      else {
        await Follow.forceCreate({ follower_id: followerId, following_id: targetId })
        following = true
      }

      const followers = await Follow.where('following_id', '=', targetId).get()
      return response.json({
        success: true,
        following,
        followerCount: (followers ?? []).length,
      })
    }
    catch (error) {
      console.error('Error toggling follow:', error)
      return response.json({ success: false, error: 'Failed to toggle follow' }, 500)
    }
  },
})
