import { derived, onDestroy, state } from 'stx'
import { loadTerritories, type TerritoryViewport } from './useTerritoryCatalog'
import {
  createTrailMap,
  drawTrailMarker,
  drawTrailRoute,
  drawTerritoryPolygon,
  runWhenMapReady,
  trailDifficultyColor,
  type LatLng,
  type TrailMapHandle,
} from './useTrailMap'

interface TerritoryStore {
  currentUserId: () => number
  territories: () => Array<{ id: number, name: string, user_id: number, status: string, areaSize: number, conquestCount: number, defendCount: number }>
  users: () => Array<{ id: number, name: string }>
  territoryPolygons: () => Record<number, LatLng[]>
  trailRoutes: () => Record<number, LatLng[]>
  trails: () => Array<{ id: number, lat: number, lng: number, difficulty: string }>
  hydrateTerritoriesFromApi: (
    territories: unknown[],
    polygons: Record<number, LatLng[]>,
    users: unknown[],
  ) => void
}

export function useTerritoryExplorer(wl: TerritoryStore | null) {
  let territoryMap: TrailMapHandle | null = null
  let viewportTimer: ReturnType<typeof setTimeout> | null = null
  let refreshingViewport = false
  const filter = state<'all' | 'mine' | 'contested'>('all')

  const currentUserId = derived(() => wl?.currentUserId())

  const filtered = derived(() => {
    if (!wl) return []
    const f = filter()
    if (f === 'all') return wl.territories()
    if (f === 'mine') return wl.territories().filter(t => t.user_id === currentUserId())
    return wl.territories().filter(t => t.status === 'contested')
  })

  const leaderboard = derived(() => {
    if (!wl) return []
    return wl.users().map((u) => {
      const owned = wl.territories().filter(t => t.user_id === u.id)
      return {
        user_id: u.id,
        userName: u.name,
        totalTerritoriesOwned: owned.length,
        totalAreaOwned: owned.reduce((sum, t) => sum + t.areaSize, 0),
      }
    }).sort((a, b) => b.totalAreaOwned - a.totalAreaOwned).slice(0, 10)
  })

  const rankedLeaderboard = derived(() =>
    leaderboard().map((entry, index) => ({ ...entry, rank: index + 1 })),
  )

  const formatArea = (area: number): string => `${(area / 1000).toFixed(1)} km²`

  async function mountTerritoryMap() {
    if (!wl) return
    territoryMap?.destroy()
    territoryMap = await createTrailMap('territories-map', { scrollWheelZoom: true })
    if (!territoryMap) return
    const { map } = territoryMap
    const territoryLayers: Array<{ remove?: () => void }> = []
    const bounds: LatLng[] = []
    const uid = currentUserId()

    async function drawTerritories(shouldFit: boolean) {
      for (const layer of territoryLayers)
        map.removeLayer(layer as any)
      territoryLayers.length = 0

      for (const t of wl!.territories()) {
        const coords = wl!.territoryPolygons()[t.id]
        if (!coords) continue
        const isYours = t.user_id === uid
        const color = isYours ? '#059669' : '#f59e0b'
        const polygon = await drawTerritoryPolygon(map, coords, {
          color,
          fillOpacity: isYours ? 0.4 : 0.2,
          weight: isYours ? 3 : 2,
          dashArray: t.status === 'contested' ? '8 4' : undefined,
          onClick: () => polygon && map.flyToBounds(polygon.getBounds(), { padding: [40, 40] }),
        })
        if (!polygon)
          continue
        territoryLayers.push(polygon)
        if (shouldFit)
          bounds.push(...coords)
      }
    }

    await drawTerritories(true)

    const routes = wl.trailRoutes()
    for (const tr of wl.trails()) {
      if (!tr.lat || !tr.lng) continue
      const fill = trailDifficultyColor(tr.difficulty)
      const coords = routes[tr.id]
      if (coords && coords.length > 1)
        await drawTrailRoute(map, coords, { color: fill, weight: 3, opacity: 0.75 })
      await drawTrailMarker(map, tr.lat, tr.lng, {
        difficulty: tr.difficulty,
        radius: 6,
        onClick: () => {
          if (coords && coords.length > 1)
            territoryMap!.fitPoints(coords, [40, 40])
          else
            map.flyTo([tr.lat, tr.lng], 14)
        },
      })
      bounds.push([tr.lat, tr.lng])
    }

    if (bounds.length)
      territoryMap.fitPoints(bounds, [30, 30])

    // Query only what the athlete can currently see. The backend applies the
    // indexed bounding-box predicate before LIMIT, so dense cities no longer
    // crowd unrelated regions out of the response.
    map.on('moveend', () => {
      if (viewportTimer)
        clearTimeout(viewportTimer)
      viewportTimer = setTimeout(async () => {
        if (refreshingViewport || !territoryMap)
          return
        const visible: any = territoryMap.map.getBounds()
        const viewport: TerritoryViewport = {
          minLat: visible.getSouth(),
          minLng: visible.getWest(),
          maxLat: visible.getNorth(),
          maxLng: visible.getEast(),
        }
        refreshingViewport = true
        try {
          if (await loadTerritories(wl, viewport))
            await drawTerritories(false)
        }
        finally {
          refreshingViewport = false
        }
      }, 250)
    })
  }

  onDestroy(() => {
    if (viewportTimer)
      clearTimeout(viewportTimer)
    territoryMap?.destroy()
    territoryMap = null
  })

  return {
    filter,
    currentUserId,
    filtered,
    rankedLeaderboard,
    formatArea,
    mountTerritoryMap: () => runWhenMapReady('territories-map', mountTerritoryMap),
  }
}
