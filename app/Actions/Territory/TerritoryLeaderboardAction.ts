import { Action } from '@stacksjs/actions'
import { response } from '@stacksjs/router'

export default new Action({
  name: 'Territory Leaderboard',
  description: 'Get territory leaderboard rankings',
  method: 'GET',

  async handle(request) {
    const type = request.get('type') || 'area' // area, count, conquests
    const limit = request.get<number>('limit') || 50

    try {
      // Determine sort field based on type
      let sortField: string
      switch (type) {
        case 'count':
          sortField = 'totalTerritoriesOwned'
          break
        case 'conquests':
          sortField = 'territoriesConquered'
          break
        case 'area':
        default:
          sortField = 'totalAreaOwned'
      }

      // Get territory stats sorted by the specified field - TerritoryStats is auto-imported
      const stats = await TerritoryStats.orderBy(sortField, 'desc').limit(limit).get()

      // Get user info - User is auto-imported
      const userIds = stats.map((s: any) => s.userId)
      const users = await User.whereIn('id', userIds).get()
      const userMap = new Map(users.map((u: any) => [u.id, u]))

      // Build leaderboard
      const leaderboard = stats.map((s: any, index: number) => {
        const user = userMap.get(s.userId)
        return {
          rank: index + 1,
          userId: s.userId,
          userName: user?.name || 'Unknown',
          userAvatar: user?.avatar || null,
          totalTerritoriesOwned: s.totalTerritoriesOwned || 0,
          totalAreaOwned: s.totalAreaOwned || 0,
          territoriesClaimed: s.territoriesClaimed || 0,
          territoriesConquered: s.territoriesConquered || 0,
          territoriesLost: s.territoriesLost || 0,
          territoriesDefended: s.territoriesDefended || 0,
          longestOwnershipDays: s.longestOwnershipDays || 0,
          largestTerritoryArea: s.largestTerritoryArea || 0,
        }
      })

      return response.json({
        type,
        leaderboard,
        meta: {
          total: leaderboard.length,
          sortBy: sortField,
        },
      })
    }
    catch (error) {
      console.error('Error fetching leaderboard:', error)
      return response.json({
        type,
        leaderboard: [],
        error: 'Failed to fetch leaderboard',
      }, 500)
    }
  },
})
