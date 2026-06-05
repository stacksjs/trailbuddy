import { derived, onDestroy, state } from 'stx'
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
}

export function useTerritoryExplorer(tb: TerritoryStore | null) {
  let territoryMap: TrailMapHandle | null = null
  const filter = state<'all' | 'mine' | 'contested'>('all')

  const currentUserId = derived(() => tb?.currentUserId())

  const filtered = derived(() => {
    if (!tb) return []
    const f = filter()
    if (f === 'all') return tb.territories()
    if (f === 'mine') return tb.territories().filter(t => t.user_id === currentUserId())
    return tb.territories().filter(t => t.status === 'contested')
  })

  const leaderboard = derived(() => {
    if (!tb) return []
    return tb.users().map((u) => {
      const owned = tb.territories().filter(t => t.user_id === u.id)
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
    if (!tb) return
    territoryMap?.destroy()
    territoryMap = await createTrailMap('territories-map', { scrollWheelZoom: true })
    if (!territoryMap) return
    const { map } = territoryMap
    const bounds: LatLng[] = []
    const uid = currentUserId()

    for (const t of tb.territories()) {
      const coords = tb.territoryPolygons()[t.id]
      if (!coords) continue
      const isYours = t.user_id === uid
      const color = isYours ? '#059669' : '#f59e0b'
      const polygon = await drawTerritoryPolygon(map, coords, {
        color,
        fillOpacity: isYours ? 0.4 : 0.2,
        weight: isYours ? 3 : 2,
        dashArray: t.status === 'contested' ? '8 4' : undefined,
        onClick: () => map.flyToBounds(polygon.getBounds(), { padding: [40, 40] }),
      })
      bounds.push(...coords)
    }

    const routes = tb.trailRoutes()
    for (const tr of tb.trails()) {
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
  }

  onDestroy(() => {
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
