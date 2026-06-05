import { onMount, state } from 'stx'

/**
 * Hydrate the `tb` store's territories from the live API
 * (`GET /api/territories/map`), mirroring useTrailCatalog for trails. Falls back
 * silently to seed data when the API is empty/unreachable.
 */

interface TerritoryStoreLike {
  territories: () => unknown[]
  hydrateTerritoriesFromApi: (
    territories: unknown[],
    polygons: Record<number, [number, number][]>,
    users: unknown[],
  ) => void
}

interface MapFeature {
  properties: {
    id: number
    name: string
    ownerId: number
    ownerName: string
    areaSize: number
    conquestCount: number
    claimedAt: string
    status: string
    centerLat: number
    centerLng: number
  }
  geometry: { type: string, coordinates: number[][][] } | null
}

export const territorySource = state<'api' | 'seed'>('seed')
export const territoryError = state<string | null>(null)

let started = false

export function useTerritoryCatalog(tb: TerritoryStoreLike | null) {
  onMount(async () => {
    if (!tb || started)
      return
    started = true
    try {
      const res = await fetch('/api/territories/map?limit=500')
      if (!res.ok)
        throw new Error(`Territories API returned ${res.status}`)
      const payload = await res.json()
      const features: MapFeature[] = Array.isArray(payload?.features) ? payload.features : []
      if (!features.length)
        return

      const territories: any[] = []
      const polygons: Record<number, [number, number][]> = {}
      const usersById = new Map<number, any>()

      for (const f of features) {
        const p = f.properties
        territories.push({
          id: p.id,
          name: p.name,
          user_id: p.ownerId,
          areaSize: p.areaSize ?? 0,
          conquestCount: p.conquestCount ?? 0,
          defendCount: 0,
          totalRunners: 0,
          status: p.status === 'contested' ? 'contested' : 'secure',
          claimedAt: p.claimedAt ?? new Date().toISOString(),
          lat: p.centerLat ?? 0,
          lng: p.centerLng ?? 0,
        })

        // GeoJSON polygon ring is [[lng, lat], ...]; the store wants [lat, lng].
        const ring = f.geometry?.coordinates?.[0]
        if (ring)
          polygons[p.id] = ring.map(([lng, lat]) => [lat, lng] as [number, number])

        if (!usersById.has(p.ownerId)) {
          usersById.set(p.ownerId, {
            id: p.ownerId,
            name: p.ownerName || 'Unknown',
            email: '',
            avatar: null,
            joinedAt: new Date().toISOString(),
          })
        }
      }

      tb.hydrateTerritoriesFromApi(territories, polygons, [...usersById.values()])
      territorySource.set('api')
    }
    catch (err) {
      territoryError.set(err instanceof Error ? err.message : 'Could not load territories')
      territorySource.set('seed')
    }
  })
}
