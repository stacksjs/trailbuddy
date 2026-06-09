// No imports needed - everything is auto-imported!
//
// GET /api/users/{id}/follows — a user's social graph: follower/following counts
// and id lists (used to hydrate follow state + the "Following" feed). Public read.

export default new Action({
  name: 'User Follows',
  description: "Get a user's followers and following",
  method: 'GET',

  async handle(request) {
    const userId = request.get<number>('id')
    if (!userId)
      return response.json({ success: false, error: 'User ID is required' }, 400)

    try {
      const followers = await Follow.where('following_id', '=', userId).get()
      const following = await Follow.where('follower_id', '=', userId).get()

      const followerIds = (followers ?? []).map((f: any) => f.follower_id)
      const followingIds = (following ?? []).map((f: any) => f.following_id)

      return response.json({
        success: true,
        userId,
        followerCount: followerIds.length,
        followingCount: followingIds.length,
        followerIds,
        followingIds,
      })
    }
    catch (error) {
      console.error('Error fetching follows:', error)
      return response.json({ success: false, error: 'Failed to fetch follows' }, 500)
    }
  },
})
