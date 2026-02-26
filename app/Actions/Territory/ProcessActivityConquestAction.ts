// No imports needed - everything is auto-imported!

const MIN_TERRITORY_SIZE = 1000

export default new Action({
  name: 'Process Activity Conquest',
  description: 'Check if an activity conquers any territories and process partial conquest',
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

      if (!activity.gpxData) {
        return response.json({ success: false, error: 'Activity has no GPS data' }, 400)
      }

      const routeCoordinates = parseGpsData(activity.gpxData)
      if (routeCoordinates.length < 2) {
        return response.json({ success: false, error: 'Insufficient GPS data' }, 400)
      }

      const routeBbox = getBoundingBox(routeCoordinates)
      const allTerritories = await Territory.where('status', '=', 'active').get()

      const conqueredTerritories: Array<{
        originalId: number
        originalOwner: number
        conqueredArea: number
        remainingArea: number
        newTerritoryId?: number
      }> = []

      for (const territory of allTerritories) {
        if (territory.userId === userId) continue
        if (!territory.boundingBox || !boundingBoxesOverlap(routeBbox, territory.boundingBox)) continue

        const territoryPolygon = geoJsonToCoordinates(territory.polygonData)
        if (!routeIntersectsPolygon(routeCoordinates, territoryPolygon)) continue

        const splitPolygons = splitPolygonByRoute(territoryPolygon, routeCoordinates)

        if (splitPolygons.length <= 1) {
          const previousOwner = territory.userId
          const previousClaimedAt = territory.claimedAt
          const ownershipDuration = previousClaimedAt
            ? Math.floor((Date.now() - new Date(previousClaimedAt).getTime()) / 1000)
            : 0

          await territory.update({
            userId,
            conquestCount: (territory.conquestCount || 0) + 1,
            claimedAt: new Date().toISOString(),
          })

          await TerritoryHistory.create({
            territoryId: territory.id,
            userId,
            activityId,
            previousOwnerId: previousOwner,
            eventType: 'conquered',
            areaAtEvent: territory.areaSize,
            previousOwnershipDuration: ownershipDuration,
            notes: 'Full territory conquest',
          })

          conqueredTerritories.push({
            originalId: territory.id,
            originalOwner: previousOwner,
            conqueredArea: territory.areaSize,
            remainingArea: 0,
          })

          await updateConquestStats(userId, previousOwner, territory.areaSize, 0)
        }
        else {
          const previousOwner = territory.userId
          const previousClaimedAt = territory.claimedAt
          const ownershipDuration = previousClaimedAt
            ? Math.floor((Date.now() - new Date(previousClaimedAt).getTime()) / 1000)
            : 0

          const polygonAreas = splitPolygons.map(p => ({
            polygon: p,
            area: calculatePolygonArea(p),
          }))

          polygonAreas.sort((a, b) => b.area - a.area)
          const [keepPolygon, conqueredPolygon] = polygonAreas

          if (conqueredPolygon && conqueredPolygon.area >= MIN_TERRITORY_SIZE) {
            const keepCentroid = getCentroid(keepPolygon.polygon)
            await territory.update({
              polygonData: coordinatesToGeoJson(keepPolygon.polygon),
              boundingBox: getBoundingBox(keepPolygon.polygon),
              centerLat: keepCentroid.lat,
              centerLng: keepCentroid.lng,
              areaSize: keepPolygon.area,
              perimeter: calculatePerimeter(keepPolygon.polygon),
            })

            const conqueredCentroid = getCentroid(conqueredPolygon.polygon)
            const newTerritory = await Territory.create({
              userId,
              activityId,
              parentTerritoryId: territory.id,
              name: `${territory.name} (Conquered)`,
              polygonData: coordinatesToGeoJson(conqueredPolygon.polygon),
              boundingBox: getBoundingBox(conqueredPolygon.polygon),
              centerLat: conqueredCentroid.lat,
              centerLng: conqueredCentroid.lng,
              areaSize: conqueredPolygon.area,
              perimeter: calculatePerimeter(conqueredPolygon.polygon),
              status: 'active',
              conquestCount: 1,
              claimedAt: new Date().toISOString(),
            })

            await TerritoryHistory.create({
              territoryId: territory.id,
              userId: previousOwner,
              activityId,
              previousOwnerId: previousOwner,
              eventType: 'split',
              areaAtEvent: keepPolygon.area,
              previousOwnershipDuration: ownershipDuration,
              newTerritoryId: newTerritory.id,
              notes: 'Territory split - retained portion',
            })

            await TerritoryHistory.create({
              territoryId: newTerritory.id,
              userId,
              activityId,
              previousOwnerId: previousOwner,
              eventType: 'conquered',
              areaAtEvent: conqueredPolygon.area,
              previousOwnershipDuration: ownershipDuration,
              notes: 'Partial territory conquest',
            })

            conqueredTerritories.push({
              originalId: territory.id,
              originalOwner: previousOwner,
              conqueredArea: conqueredPolygon.area,
              remainingArea: keepPolygon.area,
              newTerritoryId: newTerritory.id,
            })

            await updateConquestStats(userId, previousOwner, conqueredPolygon.area, keepPolygon.area)
          }
        }
      }

      return response.json({
        success: true,
        conqueredCount: conqueredTerritories.length,
        territories: conqueredTerritories,
      })
    }
    catch (error) {
      console.error('Error processing conquest:', error)
      return response.json({
        success: false,
        error: 'Failed to process conquest',
      }, 500)
    }
  },
})

async function updateConquestStats(
  conquerorId: number,
  previousOwnerId: number,
  conqueredArea: number,
  remainingArea: number,
) {
  const conquerorStats = await TerritoryStats.where('userId', '=', conquerorId).first()
  if (conquerorStats) {
    await conquerorStats.update({
      totalTerritoriesOwned: (conquerorStats.totalTerritoriesOwned || 0) + 1,
      totalAreaOwned: (conquerorStats.totalAreaOwned || 0) + conqueredArea,
      territoriesConquered: (conquerorStats.territoriesConquered || 0) + 1,
      largestTerritoryArea: Math.max(conquerorStats.largestTerritoryArea || 0, conqueredArea),
    })
  }
  else {
    await TerritoryStats.create({
      userId: conquerorId,
      totalTerritoriesOwned: 1,
      totalAreaOwned: conqueredArea,
      territoriesClaimed: 0,
      territoriesConquered: 1,
      territoriesLost: 0,
      territoriesDefended: 0,
      longestOwnershipDays: 0,
      largestTerritoryArea: conqueredArea,
      weeklyRank: 999,
      allTimeRank: 999,
    })
  }

  const previousOwnerStats = await TerritoryStats.where('userId', '=', previousOwnerId).first()
  if (previousOwnerStats) {
    const lostTerritory = remainingArea === 0 ? 1 : 0
    const newTotalOwned = remainingArea === 0
      ? Math.max(0, (previousOwnerStats.totalTerritoriesOwned || 0) - 1)
      : previousOwnerStats.totalTerritoriesOwned || 0

    await previousOwnerStats.update({
      totalTerritoriesOwned: newTotalOwned,
      totalAreaOwned: Math.max(0, (previousOwnerStats.totalAreaOwned || 0) - conqueredArea),
      territoriesLost: (previousOwnerStats.territoriesLost || 0) + lostTerritory,
    })
  }
}
