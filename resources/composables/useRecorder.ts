import type * as Leaflet from 'leaflet'
import { derived, onDestroy, onMount, state } from 'stx'

declare const L: typeof Leaflet

type LatLng = [number, number]
type ActivityType = 'Trail Run' | 'Hike' | 'Walk' | 'Bike'
type RecordMode = 'idle' | 'simulated' | 'manual'
type GpsStatus = 'searching' | 'active' | 'stopped'

interface Trail {
  id: number
  name: string
  location: string
  difficulty: 'easy' | 'moderate' | 'hard'
  distance: number
  lat: number
  lng: number
}

interface Territory {
  id: number
  name: string
  user_id: number
  areaSize: number
  conquestCount: number
}

interface TrailStore {
  currentUserId: () => number
  trails: () => Trail[]
  territories: () => Territory[]
  territoryPolygons: () => Record<number, LatLng[]>
  trailRoutes: () => Record<number, LatLng[]>
  findTrail: (id: number) => Trail | undefined
  conquerTerritory: (id: number, distance: number) => void
  addActivity: (activity: Record<string, unknown>) => void
}

interface RecorderOptions {
  mapElId: string
  tb: TrailStore | null
}

const YOURS = '#059669'
const ENEMY = '#f59e0b'
const SIM_ROUTE = '#0ea5e9'

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function haversine(a: LatLng, b: LatLng): number {
  const R = 3958.8
  const dLat = (b[0] - a[0]) * Math.PI / 180
  const dLng = (b[1] - a[1]) * Math.PI / 180
  const lat1 = a[0] * Math.PI / 180
  const lat2 = b[0] * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function pointInPolygon(pt: LatLng, poly: LatLng[]): boolean {
  const [lat, lng] = pt
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [iLat, iLng] = poly[i]
    const [jLat, jLng] = poly[j]
    const intersect = (iLng > lng) !== (jLng > lng)
      && lat < (jLat - iLat) * (lng - iLng) / (jLng - iLng) + iLat
    if (intersect) inside = !inside
  }
  return inside
}

export function useRecorder({ mapElId, tb }: RecorderOptions) {
  const recording = state(false)
  const paused = state(false)
  const activityType = state<ActivityType>('Trail Run')
  const mode = state<RecordMode>('idle')
  const elapsed = state(0)
  const distance = state(0)
  const elevation = state(0)
  const gpsStatus = state<GpsStatus>('searching')
  const selectedTrailId = state<number>(tb?.trails()[0]?.id ?? 0)
  const conqueredIds = state<number[]>([])
  const conquestToast = state<string | null>(null)

  const trailOptions = derived(() =>
    tb ? tb.trails().map(t => ({ id: t.id, name: t.name, location: t.location })) : [],
  )

  const refs: {
    map: Leaflet.Map | null
    territoryLayers: Record<number, Leaflet.Polygon>
    trailMarkers: Record<number, Leaflet.CircleMarker>
    routeLine: Leaflet.Polyline | null
    routeCoords: LatLng[]
    hereMarker: Leaflet.CircleMarker | null
    elapsedTimer: ReturnType<typeof setInterval> | null
    simTimer: ReturnType<typeof setInterval> | null
    watchId: number | null
    toastTimer: ReturnType<typeof setTimeout> | null
  } = {
    map: null,
    territoryLayers: {},
    trailMarkers: {},
    routeLine: null,
    routeCoords: [],
    hereMarker: null,
    elapsedTimer: null,
    simTimer: null,
    watchId: null,
    toastTimer: null,
  }

  function paintTerritory(territoryId: number, mine: boolean) {
    const layer = refs.territoryLayers[territoryId]
    if (!layer) return
    const color = mine ? YOURS : ENEMY
    layer.setStyle({ color, fillColor: color, fillOpacity: mine ? 0.45 : 0.15 })
  }

  function flashConquest(name: string) {
    conquestToast.set(`Conquered ${name}!`)
    if (refs.toastTimer) clearTimeout(refs.toastTimer)
    refs.toastTimer = setTimeout(() => conquestToast.set(null), 2800)
  }

  function checkConquest(lat: number, lng: number) {
    if (!tb) return
    const uid = tb.currentUserId()
    const polys = tb.territoryPolygons()
    const territories = tb.territories()
    const already = conqueredIds()
    for (const t of territories) {
      if (t.user_id === uid) continue
      if (already.includes(t.id)) continue
      const poly = polys[t.id]
      if (!poly) continue
      if (pointInPolygon([lat, lng], poly)) {
        tb.conquerTerritory(t.id, Number(distance().toFixed(2)))
        conqueredIds.set([...conqueredIds(), t.id])
        paintTerritory(t.id, true)
        flashConquest(t.name)
      }
    }
  }

  function addRoutePoint(lat: number, lng: number) {
    if (!refs.routeLine || !refs.map) return
    const coords = refs.routeCoords
    if (coords.length > 0) {
      const prev = coords[coords.length - 1]
      distance.set(distance() + haversine(prev, [lat, lng]))
    }
    coords.push([lat, lng])
    refs.routeLine.setLatLngs(coords)
    checkConquest(lat, lng)
  }

  function clearTimers() {
    if (refs.elapsedTimer) { clearInterval(refs.elapsedTimer); refs.elapsedTimer = null }
    if (refs.simTimer) { clearInterval(refs.simTimer); refs.simTimer = null }
    if (refs.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(refs.watchId)
      refs.watchId = null
    }
  }

  function resetRun() {
    clearTimers()
    elapsed.set(0)
    distance.set(0)
    elevation.set(0)
    conqueredIds.set([])
    conquestToast.set(null)
    paused.set(false)
    refs.routeCoords = []
    if (refs.routeLine && refs.map) {
      refs.map.removeLayer(refs.routeLine)
      refs.routeLine = null
    }
    if (tb) {
      const uid = tb.currentUserId()
      for (const t of tb.territories()) paintTerritory(t.id, t.user_id === uid)
    }
  }

  function startTicker() {
    refs.elapsedTimer = setInterval(() => {
      if (!paused() && recording()) elapsed.set(elapsed() + 1)
    }, 1000)
  }

  function simulate() {
    if (!tb || !refs.map) return
    const id = selectedTrailId()
    const route = tb.trailRoutes()[id]
    if (!route || route.length < 2) return
    resetRun()
    mode.set('simulated')
    recording.set(true)
    gpsStatus.set('active')
    refs.routeCoords = []
    refs.routeLine = L.polyline([], { color: SIM_ROUTE, weight: 5, opacity: 0.9 }).addTo(refs.map)
    refs.map.fitBounds(L.latLngBounds(route), { padding: [40, 40] })
    let i = 0
    startTicker()
    refs.simTimer = setInterval(() => {
      if (paused() || !recording()) return
      if (i >= route.length) {
        stop()
        return
      }
      const [lat, lng] = route[i++]
      addRoutePoint(lat, lng)
      elevation.set(elevation() + Math.round(Math.random() * 12))
    }, 350)
  }

  function startManual() {
    if (!refs.map) return
    if (!navigator.geolocation) {
      gpsStatus.set('stopped')
      alert('Geolocation is not available on this device. Use Simulate Trail Run instead.')
      return
    }
    resetRun()
    mode.set('manual')
    gpsStatus.set('searching')
    refs.routeCoords = []
    refs.routeLine = L.polyline([], { color: YOURS, weight: 5, opacity: 0.9 }).addTo(refs.map)

    const beginTracking = (startLat: number, startLng: number) => {
      recording.set(true)
      gpsStatus.set('active')
      addRoutePoint(startLat, startLng)
      refs.map!.setView([startLat, startLng], 17)
      startTicker()
      refs.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          gpsStatus.set('active')
          addRoutePoint(pos.coords.latitude, pos.coords.longitude)
          refs.map!.panTo([pos.coords.latitude, pos.coords.longitude])
        },
        () => gpsStatus.set('searching'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      )
    }

    navigator.geolocation.getCurrentPosition(
      pos => beginTracking(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        gpsStatus.set('stopped')
        if (refs.routeLine && refs.map) {
          refs.map.removeLayer(refs.routeLine)
          refs.routeLine = null
        }
        alert(err.code === err.PERMISSION_DENIED
          ? 'Location permission denied. Enable it in your browser settings to record a run.'
          : 'Could not get your location. Try again in a moment.')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    )
  }

  function togglePause() {
    paused.set(!paused())
  }

  function stop() {
    recording.set(false)
    paused.set(false)
    gpsStatus.set('stopped')
    clearTimers()
    if (distance() > 0 && tb) {
      const trail = mode() === 'simulated' ? tb.findTrail(selectedTrailId()) : null
      tb.addActivity({
        user_id: tb.currentUserId(),
        userName: 'You',
        trail_id: trail?.id ?? null,
        trail_name: trail?.name ?? `${activityType()} Activity`,
        title: `${activityType()} — ${new Date().toLocaleDateString()}`,
        activityType: activityType(),
        distance: Number(distance().toFixed(2)),
        duration: fmtDuration(elapsed()),
        moving_time: fmtDuration(elapsed()),
        pace: distance() > 0.01 ? `${fmtDuration(Math.round(elapsed() / distance()))}/mi` : '--',
        elevation_gain: elevation(),
        calories: Math.round(elapsed() / 60 * 10),
        heartRateAvg: null,
        heartRateMax: null,
        cadence: null,
        splits: [],
        kudos_count: 0,
        comments: [],
      })
    }
    mode.set('idle')
  }

  onMount(() => {
    try {
      if (typeof L === 'undefined' || !tb) return
      const el = document.getElementById(mapElId) as (HTMLElement & { _leaflet_map?: Leaflet.Map, _leaflet_id?: number | null }) | null
      if (!el) return
      // Dispose any previous Leaflet instance attached to this element
      // (happens on SPA re-navigation — refs is a fresh object each setup)
      if (el._leaflet_map) {
        try { el._leaflet_map.remove() }
        catch { /* noop */ }
      }
      el._leaflet_id = null
      el.innerHTML = ''
      const map = L.map(mapElId, { scrollWheelZoom: true, zoomControl: true })
      el._leaflet_map = map
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
        detectRetina: true,
      }).addTo(map)
      refs.map = map

      const uid = tb.currentUserId()
      const polys = tb.territoryPolygons()
      const bounds: LatLng[] = []

      for (const t of tb.territories()) {
        const poly = polys[t.id]
        if (!poly) continue
        const mine = t.user_id === uid
        const color = mine ? YOURS : ENEMY
        const layer = L.polygon(poly, {
          color,
          fillColor: color,
          fillOpacity: mine ? 0.45 : 0.15,
          weight: 2,
        }).addTo(map).bindPopup(`<b>${t.name}</b><br>${mine ? 'Yours' : 'Enemy'} — ${(t.areaSize / 1000).toFixed(1)} km²<br>${t.conquestCount} conquests`)
        refs.territoryLayers[t.id] = layer
        bounds.push(...poly)
      }

      for (const tr of tb.trails()) {
        if (!tr.lat || !tr.lng) continue
        const marker = L.circleMarker([tr.lat, tr.lng], {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: tr.difficulty === 'hard' ? '#dc2626' : tr.difficulty === 'moderate' ? '#f59e0b' : '#10b981',
          fillOpacity: 0.95,
        }).addTo(map).bindPopup(`<b>${tr.name}</b><br>${tr.location}<br>${tr.distance} mi • ${tr.difficulty}`)
        marker.on('click', () => selectedTrailId.set(tr.id))
        refs.trailMarkers[tr.id] = marker
        bounds.push([tr.lat, tr.lng])
      }

      if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] })
      else map.setView([37.7749, -122.4194], 5)

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const here = L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
              radius: 8,
              color: '#ffffff',
              weight: 3,
              fillColor: '#3b82f6',
              fillOpacity: 1,
            }).addTo(map).bindPopup('You are here')
            refs.hereMarker = here
            gpsStatus.set('active')
            map.setView([pos.coords.latitude, pos.coords.longitude], 14)
          },
          () => gpsStatus.set('searching'),
          { enableHighAccuracy: true },
        )
      }
    }
    catch (err) {
      console.error('record map init failed:', err)
    }
  })

  onDestroy(() => {
    clearTimers()
    if (refs.toastTimer) clearTimeout(refs.toastTimer)
    if (refs.map) {
      try { refs.map.remove() }
      catch { /* noop */ }
    }
  })

  return {
    // state
    recording,
    paused,
    activityType,
    mode,
    elapsed,
    distance,
    elevation,
    gpsStatus,
    selectedTrailId,
    conqueredIds,
    conquestToast,
    trailOptions,
    // actions
    simulate,
    startManual,
    togglePause,
    stop,
    // helpers
    fmtDuration,
  }
}
