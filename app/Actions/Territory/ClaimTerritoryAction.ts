// NOTE: the ORM is snake_case end-to-end (rows + write payloads use column
// names like user_id / gpx_data / area_size). Reads and write keys below use
// snake_case accordingly; the JSON response keeps camelCase for API consumers.

import { evaluateAchievementsForUser } from '../Achievement/EvaluateAchievementsAction'
import { recomputeTerritoryRanks } from './ComputeTerritoryRanksAction'

const MIN_TERRITORY_SIZE = 1000
const MAX_TERRITORY_SIZE = 5000000

export default new Action({
  name: 'Claim Territory',
  description: 'Claim a new territory from a completed activity with a closed loop GPS track',
  method: 'POST',

  async handle(request) {
    const activityId = positiveInt(request.get('activity_id'))
    // Acting user comes from the authenticated session (route is behind `auth`).
    // The body fallback only fires for in-process callers (the seed harness),
    // never over HTTP — so a client can't claim as another user.
    const userId = (await Auth.user().catch(() => null))?.id ?? positiveInt(request.get('user_id'))

    // Field validation (#977): malformed input → 422 with a field-keyed map.
    const fields: Record<string, string> = {}
    if (!activityId)
      fields.activity_id = 'required: a positive integer activity id'
    if (!userId)
      fields.user_id = 'required: authenticated session (or user_id in the harness)'
    if (Object.keys(fields).length)
      return response.json({ success: false, error: 'Validation failed', fields }, 422)

    try {
      const activity = await Activity.find(activityId)
      if (!activity) {
        return response.json({ success: false, error: 'Activity not found' }, 404)
      }

      if (activity.user_id !== userId) {
        return response.json({ success: false, error: 'Activity does not belong to user' }, 403)
      }

      // Idempotency (#947 review): this activity has already claimed land. The
      // overlap check below blocks a re-claim only while that territory is
      // still active/contested — if it later expired, re-POSTing would award
      // claim XP again. Guard on the 'claimed' history event instead.
      const priorClaims = (await TerritoryHistory.where('activity_id', '=', activityId).get()) ?? []
      if (priorClaims.some((h: any) => h.event_type === 'claimed')) {
        const existing = await TerritoryStats.where('user_id', '=', userId).first()
        return response.json({ success: true, alreadyProcessed: true, xpGained: 0, totalXp: existing?.xp || 0 })
      }

      if (!activity.gpx_data) {
        return response.json({ success: false, error: 'Activity has no GPS data' }, 400)
      }

      const validation = validateGpsDataForClaim(activity.gpx_data)
      if (!validation.valid) {
        return response.json({ success: false, error: validation.error }, 400)
      }

      const coordinates = validation.coordinates!

      // Anti-cheat: reject fabricated tracks (teleport jumps / too short).
      const realism = validateTrackRealism(coordinates)
      if (!realism.valid) {
        return response.json({ success: false, error: realism.error, code: 'invalid_track' }, 400)
      }

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

      // Reject claims that overlap existing territory — a loop run over occupied
      // land is handled by conquest (route-intersection split), not by stacking
      // a second overlapping territory on top (which produced undefined state).
      // Contested land is still owned land; only 'expired' land is reclaimable.
      const activeTerritories = await Territory.whereIn('status', ['active', 'contested']).get()
      for (const t of (activeTerritories ?? [])) {
        if (!t.polygon_data) continue
        if (polygonsOverlap(simplified, geoJsonToCoordinates(t.polygon_data))) {
          return response.json({
            success: false,
            error: 'Territory overlaps existing land — run through it to conquer instead',
            code: 'overlap',
          }, 409)
        }
      }

      const perimeter = calculatePerimeter(simplified)
      const centroid = getCentroid(simplified)
      const boundingBox = getBoundingBox(simplified)
      const polygonData = coordinatesToGeoJson(simplified)

      const territory = await Territory.forceCreate({
        user_id: userId,
        activity_id: activityId,
        name: `Territory #${Date.now()}`,
        polygon_data: polygonData,
        bounding_box: boundingBox,
        center_lat: centroid.lat,
        center_lng: centroid.lng,
        area_size: area,
        perimeter,
        status: 'active',
        conquest_count: 0,
        claimed_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })

      await TerritoryHistory.forceCreate({
        territory_id: territory.id,
        user_id: userId,
        activity_id: activityId,
        event_type: 'claimed',
        area_at_event: area,
        notes: 'Initial claim',
      })

      // XP for claiming new ground (#947), persisted to territory_stats.
      const xpGained = XP_REWARDS.claim(area)
      const stats = await TerritoryStats.where('user_id', '=', userId).first()
      const prevXp = stats?.xp || 0
      if (stats) {
        await TerritoryStats.forceUpdate(stats.id, {
          total_territories_owned: (stats.total_territories_owned || 0) + 1,
          total_area_owned: (stats.total_area_owned || 0) + area,
          territories_claimed: (stats.territories_claimed || 0) + 1,
          largest_territory_area: Math.max(stats.largest_territory_area || 0, area),
          xp: prevXp + xpGained,
        })
      }
      else {
        await TerritoryStats.forceCreate({
          user_id: userId,
          total_territories_owned: 1,
          total_area_owned: area,
          territories_claimed: 1,
          territories_conquered: 0,
          territories_lost: 0,
          territories_defended: 0,
          longest_ownership_days: 0,
          largest_territory_area: area,
          xp: xpGained,
          // Unranked until the recompute below assigns real ranks (#944).
          weekly_rank: null,
          all_time_rank: null,
        })
      }

      // Holdings changed — refresh persisted leaderboard ranks (#944).
      await recomputeTerritoryRanks().catch((err: unknown) =>
        console.error('Rank recompute after claim failed:', err))

      // Unlock engine hook (#982): owning land moves Empire Builder.
      await evaluateAchievementsForUser(userId).catch((err: unknown) =>
        console.error('[achievements] evaluate after claim failed:', err))

      return response.json({
        success: true,
        xpGained,
        totalXp: prevXp + xpGained,
        territory: {
          id: territory.id,
          name: territory.name,
          areaSize: territory.area_size,
          perimeter: territory.perimeter,
          centerLat: territory.center_lat,
          centerLng: territory.center_lng,
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
