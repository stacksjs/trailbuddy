// Auth is imported explicitly: it is NOT in the API server bundle's auto-imports,
// so `Auth.user()` threw "Auth.user is not a function" at runtime in production
// while type-checking clean against the declarations. Everything else here is
// auto-imported as usual.
//
// GET /api/users/{id}/follows - a user's social graph: follower/following counts
// and id lists (used to hydrate follow state + the "Following" feed). Public read.

import { Auth } from '@stacksjs/auth'

export default new Action({
  name: 'User Follows',
  description: "Get a user's followers and following",
  method: 'GET',

  async handle(request) {
    const userId = request.get<number>('id')
    if (!userId)
      return response.json({ success: false, error: 'User ID is required' }, 400)

    try {
      const viewerId = (await Auth.user().catch(() => null))?.id ?? null
      const blockedIds = await blockedUserIdsFor(viewerId)
      if (blockedIds.has(userId))
        return response.json({ success: false, error: 'User not found' }, 404)
      const followers = await Follow.where('following_id', '=', userId).get()
      const following = await Follow.where('follower_id', '=', userId).get()

      const followerIds = (followers ?? []).map((f: any) => f.follower_id).filter((id: number) => !blockedIds.has(id))
      const followingIds = (following ?? []).map((f: any) => f.following_id).filter((id: number) => !blockedIds.has(id))

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
