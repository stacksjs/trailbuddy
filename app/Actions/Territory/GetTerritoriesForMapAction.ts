// No imports needed - everything is auto-imported!

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
      const query = Territory.where('status', '=', 'active')
      const territories = await query.limit(limit).get()

      let filteredTerritories = territories
      if (minLat !== undefined && minLng !== undefined && maxLat !== undefined && maxLng !== undefined) {
        filteredTerritories = territories.filter((t: any) => {
          if (!t.boundingBox) return false
          const bbox = parseBoundingBox(t.boundingBox)
          return !(bbox.maxLat < minLat || bbox.minLat > maxLat
            || bbox.maxLng < minLng || bbox.minLng > maxLng)
        })
      }

      const userIds = [...new Set(filteredTerritories.map((t: any) => t.userId))]
      const users = await User.whereIn('id', userIds).get()
      const userMap = new Map(users.map((u: any) => [u.id, u]))

      const features = filteredTerritories.map((t: any) => {
        const owner = userMap.get(t.userId)
        const isOwned = currentUserId ? t.userId === currentUserId : false

        let geometry
        try {
          geometry = JSON.parse(t.polygonData)
        }
        catch {
          geometry = null
        }

        return {
          type: 'Feature',
          properties: {
            id: t.id,
            name: t.name,
            ownerId: t.userId,
            ownerName: owner?.name || 'Unknown',
            isOwned,
            areaSize: t.areaSize,
            perimeter: t.perimeter,
            conquestCount: t.conquestCount,
            claimedAt: t.claimedAt,
            status: t.status,
            centerLat: t.centerLat,
            centerLng: t.centerLng,
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
