// No imports needed - everything is auto-imported!
//
// NOTE: the ORM is snake_case (rows expose column names). Model reads below use
// snake_case; the GeoJSON properties keep camelCase for the map/frontend.

export default new Action({
  name: 'Get Territories For Map',
  description: 'Get territories within a bounding box for map display',
  method: 'GET',

  async handle(request) {
    const minLat = request.get<number>('min_lat')
    const minLng = request.get<number>('min_lng')
    const maxLat = request.get<number>('max_lat')
    const maxLng = request.get<number>('max_lng')
    const currentUserId = request.get<number>('user_id')
    const limit = request.get<number>('limit') || 100

    try {
      // Contested territories are still on the map — they're the interesting
      // ones (under attack). Only future non-live states would be excluded.
      const query = Territory.whereIn('status', ['active', 'contested'])
      const territories = await query.limit(limit).get()

      let filteredTerritories = territories
      if (minLat !== undefined && minLng !== undefined && maxLat !== undefined && maxLng !== undefined) {
        filteredTerritories = territories.filter((t: any) => {
          if (!t.bounding_box) return false
          const bbox = parseBoundingBox(t.bounding_box)
          return !(bbox.maxLat < minLat || bbox.minLat > maxLat
            || bbox.maxLng < minLng || bbox.minLng > maxLng)
        })
      }

      const userIds = [...new Set(filteredTerritories.map((t: any) => t.user_id))]
      const users = await User.whereIn('id', userIds).get()
      const userMap = new Map(users.map((u: any) => [u.id, u]))

      // Defense counts come from the history log (the 'defended' events #941
      // writes), so the map can show real defend tallies per territory.
      const defendRows = (await TerritoryHistory.where('event_type', '=', 'defended').get()) ?? []
      const defendCounts = new Map<number, number>()
      for (const row of defendRows)
        defendCounts.set(row.territory_id, (defendCounts.get(row.territory_id) ?? 0) + 1)

      const features = filteredTerritories.map((t: any) => {
        const owner = userMap.get(t.user_id)
        const isOwned = currentUserId ? t.user_id === currentUserId : false

        let geometry
        try {
          geometry = JSON.parse(t.polygon_data)
        }
        catch {
          geometry = null
        }

        return {
          type: 'Feature',
          properties: {
            id: t.id,
            name: t.name,
            ownerId: t.user_id,
            ownerName: owner?.name || 'Unknown',
            isOwned,
            areaSize: t.area_size,
            perimeter: t.perimeter,
            conquestCount: t.conquest_count,
            defendCount: defendCounts.get(t.id) ?? 0,
            claimedAt: t.claimed_at,
            status: t.status,
            centerLat: t.center_lat,
            centerLng: t.center_lng,
          },
          geometry,
        }
      }).filter(f => f.geometry !== null)

      return response.json({
        type: 'FeatureCollection',
        features,
        meta: {
          total: features.length,
          bounds: minLat !== undefined ? { minLat, minLng, maxLat, maxLng } : null,
        },
      })
    }
    catch (error) {
      console.error('Error fetching territories for map:', error)
      return response.json({
        type: 'FeatureCollection',
        features: [],
        error: 'Failed to fetch territories',
      }, 500)
    }
  },
})
