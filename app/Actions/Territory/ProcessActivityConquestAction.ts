// No imports needed - everything is auto-imported!
//
// NOTE: the ORM is snake_case end-to-end (rows + write payloads use column
// names). Reads/write keys below use snake_case; the JSON response keeps
// camelCase for API consumers.
//
// Accounting semantics (#951):
//  - `total_territories_owned` / `total_area_owned` are CURRENT holdings;
//    `territories_claimed/conquered/lost` are lifetime counters. Losing part
//    of a territory (split) reduces area but is NOT a territory lost.
//  - On a split the previous owner's area drops by the territory's actual
//    shrinkage (original - retained) while the conqueror gains the new
//    piece's area; the two can differ by geometric rounding, so each side
//    uses its own real delta — area is never invented.
//  - Stats are written only after the territory create/update succeeded, and
//    each territory is processed in isolation (per-territory try/catch) so a
//    failure on one can't corrupt the others. The ORM exposes no transaction
//    API to actions; write ordering is the pragmatic equivalent.
//  - Re-POSTing the same activity is a no-op: conquest events are recorded
//    in territory_histories keyed by activity_id, and an activity that
//    already produced conquest events is not processed again.

const MIN_TERRITORY_SIZE = 1000

export default new Action({
  name: 'Process Activity Conquest',
  description: 'Check if an activity conquers any territories and process partial conquest',
  method: 'POST',

  async handle(request) {
    const activityId = request.get<number>('activity_id')
    // Acting user from the authenticated session (route is behind `auth`); body
    // fallback is for the in-process seed harness only.
    const userId = (await Auth.user().catch(() => null))?.id ?? request.get<number>('user_id')

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

      // You can only conquer with your own runs (mirrors ClaimTerritoryAction).
      if (activity.user_id !== userId) {
        return response.json({ success: false, error: 'Activity does not belong to user' }, 403)
      }

      if (!activity.gpx_data) {
        return response.json({ success: false, error: 'Activity has no GPS data' }, 400)
      }

      const routeCoordinates = parseGpsData(activity.gpx_data)
      if (routeCoordinates.length < 2) {
        return response.json({ success: false, error: 'Insufficient GPS data' }, 400)
      }

      // Anti-cheat: reject fabricated tracks (teleport jumps / too short).
      const realism = validateTrackRealism(routeCoordinates)
      if (!realism.valid) {
        return response.json({ success: false, error: realism.error, code: 'invalid_track' }, 400)
      }

      // Idempotency: if this activity already produced conquest events (e.g. a
      // client retry of the same POST), don't conquer twice.
      const priorEvents = (await TerritoryHistory.where('activity_id', '=', activityId).get()) ?? []
      if (priorEvents.some((h: any) => h.event_type === 'conquered' || h.event_type === 'split')) {
        return response.json({
          success: true,
          conqueredCount: 0,
          territories: [],
          alreadyProcessed: true,
        })
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

        // Each territory is processed in isolation: a geometry/write failure on
        // one must not abort the loop or leave another's stats half-applied.
        try {
          const territoryPolygon = geoJsonToCoordinates(territory.polygon_data)
          if (!routeIntersectsPolygon(routeCoordinates, territoryPolygon)) continue

          const splitPolygons = splitPolygonByRoute(territoryPolygon, routeCoordinates)

          const previousOwner = territory.user_id
          const previousClaimedAt = territory.claimed_at
          const ownershipDuration = previousClaimedAt
            ? Math.floor((Date.now() - new Date(previousClaimedAt).getTime()) / 1000)
            : 0

          if (splitPolygons.length <= 1) {
            // No clean cut — full takeover. The new owner's territory is
            // 'active' regardless of any prior state.
            await Territory.forceUpdate(territory.id, {
              user_id: userId,
              status: 'active',
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

            await updateConquestStats({
              conquerorId: userId,
              previousOwnerId: previousOwner,
              areaGained: territory.area_size,
              areaLost: territory.area_size,
              wholeTerritory: true,
              ownershipDurationSeconds: ownershipDuration,
            })
          }
          else {
            const polygonAreas = splitPolygons.map(p => ({
              polygon: p,
              area: calculatePolygonArea(p),
            }))

            // Game rule: the owner keeps the larger piece; the attacker carves
            // off the smaller one. A through-run can't steal the better half.
            polygonAreas.sort((a, b) => b.area - a.area)
            const [keepPolygon, conqueredPolygon] = polygonAreas

            // Below-threshold slice: too small to become a territory, no effect.
            if (!conqueredPolygon || conqueredPolygon.area < MIN_TERRITORY_SIZE) continue

            const keepCentroid = getCentroid(keepPolygon.polygon)
            await Territory.forceUpdate(territory.id, {
              polygon_data: coordinatesToGeoJson(keepPolygon.polygon),
              bounding_box: getBoundingBox(keepPolygon.polygon),
              center_lat: keepCentroid.lat,
              center_lng: keepCentroid.lng,
              area_size: keepPolygon.area,
              perimeter: calculatePerimeter(keepPolygon.polygon),
              // The original territory was (partially) conquered too.
              conquest_count: (territory.conquest_count || 0) + 1,
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

            // Retained-portion row: ownership did NOT change on this piece, so
            // previous_owner_id stays null — it links to the new piece instead.
            await TerritoryHistory.forceCreate({
              territory_id: territory.id,
              user_id: previousOwner,
              activity_id: activityId,
              previous_owner_id: null,
              event_type: 'split',
              area_at_event: keepPolygon.area,
              previous_ownership_duration: ownershipDuration,
              new_territory_id: newTerritory.id,
              notes: 'Territory split — retained portion',
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

            await updateConquestStats({
              conquerorId: userId,
              previousOwnerId: previousOwner,
              areaGained: conqueredPolygon.area,
              // The owner's holdings shrank by the territory's actual change,
              // which is not exactly the conquered piece's area.
              areaLost: Math.max(0, (territory.area_size || 0) - keepPolygon.area),
              wholeTerritory: false,
              ownershipDurationSeconds: ownershipDuration,
            })
          }
        }
        catch (error) {
          console.error(`Error processing conquest for territory #${territory.id}:`, error)
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

async function updateConquestStats(update: {
  conquerorId: number
  previousOwnerId: number
  areaGained: number
  areaLost: number
  wholeTerritory: boolean
  ownershipDurationSeconds: number
}) {
  const { conquerorId, previousOwnerId, areaGained, areaLost, wholeTerritory, ownershipDurationSeconds } = update

  // Conqueror: gains one territory either way (the absorbed whole, or the new
  // carved-off piece) plus its area.
  const conquerorStats = await TerritoryStats.where('user_id', '=', conquerorId).first()
  if (conquerorStats) {
    await TerritoryStats.forceUpdate(conquerorStats.id, {
      total_territories_owned: (conquerorStats.total_territories_owned || 0) + 1,
      total_area_owned: (conquerorStats.total_area_owned || 0) + areaGained,
      territories_conquered: (conquerorStats.territories_conquered || 0) + 1,
      largest_territory_area: Math.max(conquerorStats.largest_territory_area || 0, areaGained),
    })
  }
  else {
    await TerritoryStats.forceCreate({
      user_id: conquerorId,
      total_territories_owned: 1,
      total_area_owned: areaGained,
      territories_claimed: 0,
      territories_conquered: 1,
      territories_lost: 0,
      territories_defended: 0,
      longest_ownership_days: 0,
      largest_territory_area: areaGained,
      weekly_rank: 999,
      all_time_rank: 999,
    })
  }

  // Previous owner: a split shrinks area but the territory survives; only a
  // whole takeover counts as a territory lost (and closes out the ownership
  // run for longest_ownership_days).
  const previousOwnerStats = await TerritoryStats.where('user_id', '=', previousOwnerId).first()
  if (previousOwnerStats) {
    const ownershipDays = Math.floor(ownershipDurationSeconds / 86400)
    await TerritoryStats.forceUpdate(previousOwnerStats.id, {
      total_territories_owned: wholeTerritory
        ? Math.max(0, (previousOwnerStats.total_territories_owned || 0) - 1)
        : previousOwnerStats.total_territories_owned || 0,
      total_area_owned: Math.max(0, (previousOwnerStats.total_area_owned || 0) - areaLost),
      territories_lost: (previousOwnerStats.territories_lost || 0) + (wholeTerritory ? 1 : 0),
      ...(wholeTerritory
        ? { longest_ownership_days: Math.max(previousOwnerStats.longest_ownership_days || 0, ownershipDays) }
        : {}),
    })
  }
}
