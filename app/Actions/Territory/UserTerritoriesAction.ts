// No imports needed - everything is auto-imported!

export default new Action({
  name: 'User Territories',
  description: 'Get all territories owned by a specific user',
  method: 'GET',

  async handle(request) {
    const userId = request.get<number>('user_id')

    if (!userId) {
      return response.json({ success: false, error: 'User ID is required' }, 400)
    }

    try {
      const user = await User.find(userId)
      if (!user) {
        return response.json({ success: false, error: 'User not found' }, 404)
      }

      const territories = await Territory
        .where('userId', '=', userId)
        .where('status', '=', 'active')
        .orderBy('areaSize', 'desc')
        .get()

      const stats = await TerritoryStats.where('userId', '=', userId).first()

      const formattedTerritories = territories.map((t: any) => ({
        id: t.id,
        name: t.name,
        areaSize: t.areaSize,
        perimeter: t.perimeter,
        centerLat: t.centerLat,
        centerLng: t.centerLng,
        conquestCount: t.conquestCount,
        claimedAt: t.claimedAt,
        polygon: t.polygonData ? JSON.parse(t.polygonData) : null,
      }))

      return response.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        },
        territories: formattedTerritories,
        stats: stats
          ? {
              totalTerritoriesOwned: stats.totalTerritoriesOwned || 0,
              totalAreaOwned: stats.totalAreaOwned || 0,
              territoriesClaimed: stats.territoriesClaimed || 0,
              territoriesConquered: stats.territoriesConquered || 0,
              territoriesLost: stats.territoriesLost || 0,
              territoriesDefended: stats.territoriesDefended || 0,
              longestOwnershipDays: stats.longestOwnershipDays || 0,
              largestTerritoryArea: stats.largestTerritoryArea || 0,
              weeklyRank: stats.weeklyRank || 0,
              allTimeRank: stats.allTimeRank || 0,
            }
          : null,
        meta: {
          total: formattedTerritories.length,
        },
      })
    }
    catch (error) {
      console.error('Error fetching user territories:', error)
      return response.json({
        success: false,
        error: 'Failed to fetch user territories',
      }, 500)
    }
  },
})
