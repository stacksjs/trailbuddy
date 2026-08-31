import { derived, onDestroy, state } from 'stx'
import {
  diffTerritories,
  formatTerritoryArea,
  territoryAppearance,
  type TerritorySnapshot,
} from '../functions/territory-style'
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

  // `area_size` is square metres, from `calculatePolygonArea`. Dividing by a
  // thousand and calling the result km² overstated every territory by a factor
  // of a thousand — a 1 km² claim read as "1000.0 km²" — and the unit is now
  // chosen for the magnitude, because the game spans four orders of it.
  const formatArea = (area: number): string => formatTerritoryArea(area)

  async function mountTerritoryMap() {
    if (!wl) return
    territoryMap?.destroy()
    territoryMap = await createTrailMap('territories-map', { scrollWheelZoom: true })
    if (!territoryMap) return
    const { map } = territoryMap
    // Keyed by territory so a pan can update what changed instead of tearing
    // the whole map down. Rebuilding everything on `moveend` destroyed and
    // recreated hundreds of paths to move the map by a block, and took any
    // open popup with them.
    const territoryLayers = new Map<number, any>()
    const drawn = new Map<number, TerritorySnapshot>()
    const bounds: LatLng[] = []
    const uid = currentUserId()

    const ownerName = (ownerId: number): string =>
      wl!.users().find(u => u.id === ownerId)?.name ?? 'Unknown athlete'

    async function addTerritory(t: { id: number, name: string, user_id: number, status: string, areaSize: number }) {
      const coords = wl!.territoryPolygons()[t.id]
      if (!coords)
        return

      const style = territoryAppearance(t.user_id, uid, t.status)
      const polygon = await drawTerritoryPolygon(map, coords, {
        ...style,
        // Colour is identity on this map, so the popup names whose it is and
        // what it is worth rather than leaving the player to decode a hue.
        popupHtml: `<strong>${t.name}</strong><br>${ownerName(t.user_id)} · ${formatTerritoryArea(t.areaSize)}`,
      })
      if (!polygon)
        return

      polygon.on('click', () => map.flyToBounds(polygon.getBounds(), { padding: [40, 40] }))
      territoryLayers.set(t.id, polygon)
    }

    function removeTerritory(id: number) {
      const layer = territoryLayers.get(id)
      if (!layer)
        return
      map.removeLayer(layer)
      territoryLayers.delete(id)
    }

    async function drawTerritories(shouldFit: boolean) {
      const polygons = wl!.territoryPolygons()
      const territories = wl!.territories()

      const snapshots: TerritorySnapshot[] = territories
        .filter(t => polygons[t.id])
        .map(t => ({
          id: t.id,
          userId: t.user_id,
          status: t.status,
          shapeVersion: String(polygons[t.id]!.length),
        }))

      const { added, changed, removed } = diffTerritories(drawn, snapshots)

      for (const id of removed)
        removeTerritory(id)

      // A changed territory is redrawn, because ownership and shape are what
      // its appearance is derived from.
      for (const snapshot of [...added, ...changed]) {
        removeTerritory(snapshot.id)
        const territory = territories.find(t => t.id === snapshot.id)
        if (territory)
          await addTerritory(territory)
      }

      drawn.clear()
      for (const snapshot of snapshots)
        drawn.set(snapshot.id, snapshot)

      if (shouldFit) {
        for (const snapshot of snapshots)
          bounds.push(...polygons[snapshot.id]!)
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
