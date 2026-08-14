import type { CircleMarker as CircleMarkerType } from 'ts-maps'
import type { Polygon as PolygonType } from 'ts-maps'
import type { Polyline as PolylineType } from 'ts-maps'
import type { TsMap as TsMapType } from 'ts-maps'

export type LatLng = [number, number]

type TsMapsModule = typeof import('ts-maps')

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

let mapsModule: TsMapsModule | null = null
let mapsLoad: Promise<TsMapsModule> | null = null

const TS_MAPS_JS = '/js/ts-maps.mjs'
const TS_MAPS_CSS = '/css/ts-maps.css'

function ensureTsMapsCss() {
  if (typeof document === 'undefined')
    return
  if (document.querySelector('link[data-ts-maps-css]'))
    return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = TS_MAPS_CSS
  link.dataset.tsMapsCss = '1'
  document.head.appendChild(link)
}

/** Lazy-load ts-maps from a separate public chunk (keeps STX page scripts small). */
export async function ensureTsMaps(): Promise<TsMapsModule> {
  if (mapsModule)
    return mapsModule
  if (!mapsLoad) {
    mapsLoad = (async () => {
      ensureTsMapsCss()
      mapsModule = await import(/* @vite-ignore */ TS_MAPS_JS) as TsMapsModule
      return mapsModule
    })()
  }
  return mapsLoad
}

export interface TrailMapHandle {
  map: TsMapType
  destroy: () => void
  fitPoints: (points: LatLng[], padding?: [number, number]) => void
}

interface TrailMapElement extends HTMLElement {
  _tsMap?: TsMapType
  _tsMapHandle?: TrailMapHandle
}

export function trailDifficultyColor(difficulty: string): string {
  if (difficulty === 'hard') return '#dc2626'
  if (difficulty === 'moderate') return '#f59e0b'
  return '#10b981'
}

function resolveElement(container: HTMLElement | string): HTMLElement | null {
  if (typeof container === 'string')
    return document.getElementById(container)
  return container
}

export async function createTrailMap(
  container: HTMLElement | string,
  options?: { center?: LatLng, zoom?: number, scrollWheelZoom?: boolean },
): Promise<TrailMapHandle | null> {
  try {
    const { TsMap, tileLayer, Polyline } = await ensureTsMaps()
    // Loading the map chunk yields to STX hydration. Resolve the target after
    // that await so a structural render cannot leave us mounting into a
    // detached copy of the original container.
    const el = resolveElement(container)
    if (!el?.isConnected)
      return null
    const mapElement = el as TrailMapElement
    if (mapElement._tsMapHandle)
      return mapElement._tsMapHandle
    const prev = mapElement._tsMap
    if (prev) {
      try { prev.remove() }
      catch { /* noop */ }
    }
    el.innerHTML = ''

    const map = new TsMap(el, {
      center: options?.center ?? [39.5, -98.35],
      zoom: options?.zoom ?? 4,
      scrollWheelZoom: options?.scrollWheelZoom ?? true,
    })
    mapElement._tsMap = map

    tileLayer(OSM_TILES, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      crossOrigin: true,
      maxZoom: 19,
      offlineCache: true,
    }).addTo(map)

    const handle: TrailMapHandle = {
      map,
      destroy() {
        try { map.remove() }
        catch { /* noop */ }
        if (mapElement._tsMap === map) {
          mapElement._tsMap = undefined
          mapElement._tsMapHandle = undefined
        }
      },
      fitPoints(points, padding = [32, 32]) {
        if (points.length < 1)
          return
        if (points.length === 1) {
          map.setView(points[0], 14)
          return
        }
        const guide = new Polyline(points, { weight: 0, opacity: 0 }).addTo(map)
        map.fitBounds(guide.getBounds(), { padding })
        map.removeLayer(guide)
      },
    }
    mapElement._tsMapHandle = handle
    return handle
  }
  catch (err) {
    console.error('[trail-map] init failed:', err)
    return null
  }
}

/** Wait for map container in DOM, then mount. Call from the page's onMount (WebView-safe). */
export function runWhenMapReady(
  containerId: string,
  mount: () => void | Promise<void>,
  options?: { delayMs?: number, maxAttempts?: number },
): () => void {
  let attempts = 0
  const max = options?.maxAttempts ?? 24
  const delay = options?.delayMs ?? 150
  let timer: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  function tryMount() {
    if (cancelled)
      return
    const el = document.getElementById(containerId)
    if (!el) {
      if (++attempts < max)
        timer = setTimeout(tryMount, delay)
      return
    }
    if (el.offsetHeight < 2 && ++attempts < max) {
      timer = setTimeout(tryMount, delay)
      return
    }
    void Promise.resolve(mount()).catch(err => console.error('[trail-map] mount failed:', err))
  }

  timer = setTimeout(tryMount, delay)

  return () => {
    cancelled = true
    if (timer)
      clearTimeout(timer)
  }
}

export async function drawTrailRoute(
  map: TsMapType,
  coords: LatLng[],
  options?: { color?: string, weight?: number, opacity?: number },
): Promise<PolylineType | null> {
  if (coords.length < 2)
    return null
  const { Polyline } = await ensureTsMaps()
  return new Polyline(coords, {
    color: options?.color ?? '#059669',
    weight: options?.weight ?? 4,
    opacity: options?.opacity ?? 0.9,
  }).addTo(map)
}

export async function drawTerritoryPolygon(
  map: TsMapType,
  coords: LatLng[],
  options: {
    color: string
    fillOpacity: number
    weight?: number
    dashArray?: string
    popupHtml?: string
    onClick?: () => void
  },
): Promise<PolygonType | null> {
  // A polygon needs three points to be a shape. Handed fewer — a territory
  // whose ring failed to load, or one the API returned without geometry —
  // ts-maps dereferences an element it never created and throws
  // `Cannot read properties of undefined (reading 'appendChild')`, which takes
  // down the whole map rather than skipping the one bad record.
  if (!Array.isArray(coords) || coords.length < 3)
    return null

  const { Polygon } = await ensureTsMaps()
  const layer = new Polygon(coords, {
    color: options.color,
    fillColor: options.color,
    fillOpacity: options.fillOpacity,
    weight: options.weight ?? 2,
    dashArray: options.dashArray,
  }).addTo(map)
  if (options.popupHtml)
    layer.bindPopup(options.popupHtml)
  if (options.onClick)
    layer.on('click', options.onClick)
  return layer
}

export async function drawTrailMarker(
  map: TsMapType,
  lat: number,
  lng: number,
  options: {
    difficulty: string
    popupHtml?: string
    radius?: number
    onClick?: () => void
  },
): Promise<CircleMarkerType> {
  const { CircleMarker } = await ensureTsMaps()
  const fill = trailDifficultyColor(options.difficulty)
  const marker = new CircleMarker([lat, lng], {
    radius: options.radius ?? 7,
    color: '#ffffff',
    weight: 2,
    fillColor: fill,
    fillOpacity: 0.95,
  }).addTo(map)
  if (options.popupHtml)
    marker.bindPopup(options.popupHtml)
  if (options.onClick)
    marker.on('click', options.onClick)
  return marker
}

export async function createLiveRouteLine(
  map: TsMapType,
  color: string,
): Promise<PolylineType> {
  const { Polyline } = await ensureTsMaps()
  return new Polyline([], { color, weight: 5, opacity: 0.9 }).addTo(map)
}
