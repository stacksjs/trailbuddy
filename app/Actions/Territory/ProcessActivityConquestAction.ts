// No imports needed - everything is auto-imported!
//
// NOTE: the ORM is snake_case end-to-end (rows + write payloads use column
// names). Reads/write keys below use snake_case; the JSON response keeps
// camelCase for API consumers.

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

      if (!activity.gpx_data) {
        return response.json({ success: false, error: 'Activity has no GPS data' }, 400)
      }

      const routeCoordinates = parseGpsData(activity.gpx_data)
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
        if (territory.user_id === userId) continue
        if (!territory.bounding_box || !boundingBoxesOverlap(routeBbox, territory.bounding_box)) continue

        const territoryPolygon = geoJsonToCoordinates(territory.polygon_data)
        if (!routeIntersectsPolygon(routeCoordinates, territoryPolygon)) continue

        const splitPolygons = splitPolygonByRoute(territoryPolygon, routeCoordinates)

        if (splitPolygons.length <= 1) {
          const previousOwner = territory.user_id
          const previousClaimedAt = territory.claimed_at
          const ownershipDuration = previousClaimedAt
            ? Math.floor((Date.now() - new Date(previousClaimedAt).getTime()) / 1000)
            : 0

          await Territory.forceUpdate(territory.id, {
            user_id: userId,
            conquest_count: (territory.conquest_count || 0) + 1,
            claimed_at: new Date().toISOString(),
          })

          await TerritoryHistory.forceCreate({
            territory_id: territory.id,
            user_id: userId,
            activity_id: activityId,
            previous_owner_id: previousOwner,
            event_type: 'conquered',
            area_at_event: territory.area_size,
            previous_ownership_duration: ownershipDuration,
            notes: 'Full territory conquest',
          })

          conqueredTerritories.push({
            originalId: territory.id,
            originalOwner: previousOwner,
            conqueredArea: territory.area_size,
            remainingArea: 0,
          })

          await updateConquestStats(userId, previousOwner, territory.area_size, 0)
        }
        else {
          const previousOwner = territory.user_id
          const previousClaimedAt = territory.claimed_at
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
            await Territory.forceUpdate(territory.id, {
              polygon_data: coordinatesToGeoJson(keepPolygon.polygon),
              bounding_box: getBoundingBox(keepPolygon.polygon),
              center_lat: keepCentroid.lat,
              center_lng: keepCentroid.lng,
              area_size: keepPolygon.area,
              perimeter: calculatePerimeter(keepPolygon.polygon),
            })

            const conqueredCentroid = getCentroid(conqueredPolygon.polygon)
            const newTerritory = await Territory.forceCreate({
              user_id: userId,
              activity_id: activityId,
              parent_territory_id: territory.id,
              name: `${territory.name} (Conquered)`,
              polygon_data: coordinatesToGeoJson(conqueredPolygon.polygon),
              bounding_box: getBoundingBox(conqueredPolygon.polygon),
              center_lat: conqueredCentroid.lat,
              center_lng: conqueredCentroid.lng,
              area_size: conqueredPolygon.area,
              perimeter: calculatePerimeter(conqueredPolygon.polygon),
              status: 'active',
              conquest_count: 1,
              claimed_at: new Date().toISOString(),
            })

            await TerritoryHistory.forceCreate({
              territory_id: territory.id,
              user_id: previousOwner,
              activity_id: activityId,
              previous_owner_id: previousOwner,
              event_type: 'split',
              area_at_event: keepPolygon.area,
              previous_ownership_duration: ownershipDuration,
              new_territory_id: newTerritory.id,
              notes: 'Territory split - retained portion',
            })

            await TerritoryHistory.forceCreate({
              territory_id: newTerritory.id,
              user_id: userId,
              activity_id: activityId,
              previous_owner_id: previousOwner,
              event_type: 'conquered',
              area_at_event: conqueredPolygon.area,
              previous_ownership_duration: ownershipDuration,
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
  const conquerorStats = await TerritoryStats.where('user_id', '=', conquerorId).first()
  if (conquerorStats) {
    await TerritoryStats.forceUpdate(conquerorStats.id, {
      total_territories_owned: (conquerorStats.total_territories_owned || 0) + 1,
      total_area_owned: (conquerorStats.total_area_owned || 0) + conqueredArea,
      territories_conquered: (conquerorStats.territories_conquered || 0) + 1,
      largest_territory_area: Math.max(conquerorStats.largest_territory_area || 0, conqueredArea),
    })
  }
  else {
    await TerritoryStats.forceCreate({
      user_id: conquerorId,
      total_territories_owned: 1,
      total_area_owned: conqueredArea,
      territories_claimed: 0,
      territories_conquered: 1,
      territories_lost: 0,
      territories_defended: 0,
      longest_ownership_days: 0,
      largest_territory_area: conqueredArea,
      weekly_rank: 999,
      all_time_rank: 999,
    })
  }

  const previousOwnerStats = await TerritoryStats.where('user_id', '=', previousOwnerId).first()
  if (previousOwnerStats) {
    const lostTerritory = remainingArea === 0 ? 1 : 0
    const newTotalOwned = remainingArea === 0
      ? Math.max(0, (previousOwnerStats.total_territories_owned || 0) - 1)
      : previousOwnerStats.total_territories_owned || 0

    await TerritoryStats.forceUpdate(previousOwnerStats.id, {
      total_territories_owned: newTotalOwned,
      total_area_owned: Math.max(0, (previousOwnerStats.total_area_owned || 0) - conqueredArea),
      territories_lost: (previousOwnerStats.territories_lost || 0) + lostTerritory,
    })
  }
}
