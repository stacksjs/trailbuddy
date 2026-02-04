// No imports needed - everything is auto-imported!

const MIN_TERRITORY_SIZE = 1000
const MAX_TERRITORY_SIZE = 5000000

export default new Action({
  name: 'Claim Territory',
  description: 'Claim a new territory from a completed activity with a closed loop GPS track',
  method: 'POST',

  async handle(request) {
    const activityId = request.get<number>('activity_id')
    const userId = request.get<number>('user_id')

    if (!activityId) {
      return response.json({ success: false, error: 'Activity ID is required' }, 400)
    }

    if (!userId) {
      return response.json({ success: false, error: 'User ID is required' }, 400)
    }

    try {
      const activity = await Activity.find(activityId)
      if (!activity) {
        return response.json({ success: false, error: 'Activity not found' }, 404)
      }

      if (activity.userId !== userId) {
        return response.json({ success: false, error: 'Activity does not belong to user' }, 403)
      }

      if (!activity.gpxData) {
        return response.json({ success: false, error: 'Activity has no GPS data' }, 400)
      }

      const validation = validateGpsDataForClaim(activity.gpxData)
      if (!validation.valid) {
        return response.json({ success: false, error: validation.error }, 400)
      }

      const coordinates = validation.coordinates!

      if (!isClosedLoop(coordinates)) {
        return response.json({
          success: false,
          error: 'GPS track does not form a closed loop (start and end must be within 50m)',
        }, 400)
      }

      const simplified = simplifyTrack(coordinates)
      const area = calculatePolygonArea(simplified)

      if (area < MIN_TERRITORY_SIZE) {
        return response.json({
          success: false,
          error: `Territory too small: ${area.toFixed(0)} sq meters (minimum: ${MIN_TERRITORY_SIZE} sq meters)`,
        }, 400)
      }

      if (area > MAX_TERRITORY_SIZE) {
        return response.json({
          success: false,
          error: `Territory too large: ${area.toFixed(0)} sq meters (maximum: ${MAX_TERRITORY_SIZE} sq meters)`,
        }, 400)
      }

      const perimeter = calculatePerimeter(simplified)
      const centroid = getCentroid(simplified)
      const boundingBox = getBoundingBox(simplified)
      const polygonData = coordinatesToGeoJson(simplified)

      const territory = await Territory.create({
        userId,
        activityId,
        name: `Territory #${Date.now()}`,
        polygonData,
        boundingBox,
        centerLat: centroid.lat,
        centerLng: centroid.lng,
        areaSize: area,
        perimeter,
        status: 'active',
        conquestCount: 0,
        claimedAt: new Date().toISOString(),
      })

      await TerritoryHistory.create({
        territoryId: territory.id,
        userId,
        activityId,
        eventType: 'claimed',
        areaAtEvent: area,
        notes: 'Initial claim',
      })

      let stats = await TerritoryStats.where('userId', '=', userId).first()
      if (stats) {
        await stats.update({
          totalTerritoriesOwned: (stats.totalTerritoriesOwned || 0) + 1,
          totalAreaOwned: (stats.totalAreaOwned || 0) + area,
          territoriesClaimed: (stats.territoriesClaimed || 0) + 1,
          largestTerritoryArea: Math.max(stats.largestTerritoryArea || 0, area),
        })
      }
      else {
        await TerritoryStats.create({
          userId,
          totalTerritoriesOwned: 1,
          totalAreaOwned: area,
          territoriesClaimed: 1,
          territoriesConquered: 0,
          territoriesLost: 0,
          territoriesDefended: 0,
          longestOwnershipDays: 0,
          largestTerritoryArea: area,
          weeklyRank: 999,
          allTimeRank: 999,
        })
      }

      return response.json({
        success: true,
        territory: {
          id: territory.id,
          name: territory.name,
          areaSize: territory.areaSize,
          perimeter: territory.perimeter,
          centerLat: territory.centerLat,
          centerLng: territory.centerLng,
        },
      })
    }
    catch (error) {
      console.error('Error claiming territory:', error)
      return response.json({
        success: false,
        error: 'Failed to claim territory',
      }, 500)
    }
  },
})
