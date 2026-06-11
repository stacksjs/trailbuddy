import { derived, onDestroy, state, useStore } from 'stx'
import type { CircleMarker as CircleMarkerType } from 'ts-maps'
import type { Polygon as PolygonType } from 'ts-maps'
import type { Polyline as PolylineType } from 'ts-maps'
import type { TsMap as TsMapType } from 'ts-maps'
import {
  createLiveRouteLine,
  createTrailMap,
  drawTerritoryPolygon,
  drawTrailMarker,
  ensureTsMaps,
  runWhenMapReady,
  type LatLng,
} from './useTrailMap'
import {
  persistRunAndProcess,
  routeToGeoJson,
  runResultMessage,
} from '../assets/scripts/game-api'
import {
  computeSplitsFromSamples,
  ELEVATION_NOISE_FLOOR_FT,
  METERS_TO_FEET,
  type MileSplit,
  type RecorderSample,
} from '../functions/splits'
import { loadTerritories } from './useTerritoryCatalog'

type ActivityType = 'Trail Run' | 'Hike' | 'Walk' | 'Bike'
type RecordMode = 'idle' | 'simulated' | 'manual'
type GpsStatus = 'searching' | 'active' | 'stopped'

interface Trail {
  id: number
  name: string
  location: string
  difficulty: 'easy' | 'moderate' | 'hard'
  distance: number
  elevation: number
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
  applyCaptureSample: (id: number, samplesNeeded?: number) => number
  resetCaptureSamples: () => void
  conquerTerritory: (id: number, distance: number) => boolean
  addSessionXp: (amount: number) => number
  addActivity: (activity: Record<string, unknown>) => void
}

interface RecorderOptions {
  mapElId: string
  tb: TrailStore | null
}

const YOURS = '#059669'
const ENEMY = '#f59e0b'
const CAPTURING = '#a855f7'
const SIM_ROUTE = '#0ea5e9'
const CAPTURE_SAMPLES_NEEDED = 10

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
  const captureProgress = state<Record<number, number>>({})
  const sessionXp = state(0)
  const runMode = state<'capture' | 'free'>('capture')
  const targetTerritoryId = state<number | null>(null)
  const conquestToast = state<string | null>(null)

  const trailOptions = derived(() =>
    tb ? tb.trails().map(t => ({ id: t.id, name: t.name, location: t.location })) : [],
  )

  const refs: {
    mapHandle: ReturnType<typeof createTrailMap> | null
    map: TsMapType | null
    territoryLayers: Record<number, PolygonType>
    trailMarkers: Record<number, CircleMarkerType>
    routeLine: PolylineType | null
    routeCoords: LatLng[]
    /** Timestamped samples (alt + moving time) for splits/elevation (#952/#953). */
    samples: RecorderSample[]
    /** Wall-clock start of the run — elapsed time includes pauses (#960). */
    startedAtMs: number | null
    hereMarker: CircleMarkerType | null
    elapsedTimer: ReturnType<typeof setInterval> | null
    simTimer: ReturnType<typeof setInterval> | null
    watchId: number | null
    toastTimer: ReturnType<typeof setTimeout> | null
  } = {
    mapHandle: null,
    map: null,
    territoryLayers: {},
    trailMarkers: {},
    routeLine: null,
    routeCoords: [],
    samples: [],
    startedAtMs: null,
    hereMarker: null,
    elapsedTimer: null,
    simTimer: null,
    watchId: null,
    toastTimer: null,
  }

  function paintTerritory(territoryId: number, mine: boolean, progress = 0) {
    const layer = refs.territoryLayers[territoryId]
    if (!layer) return
    if (mine) {
      layer.setStyle({ color: YOURS, fillColor: YOURS, fillOpacity: 0.45, weight: 3 })
      return
    }
    const pct = progress / 100
    const color = progress > 0 && progress < 100 ? CAPTURING : ENEMY
    layer.setStyle({
      color,
      fillColor: color,
      fillOpacity: 0.12 + pct * 0.38,
      weight: targetTerritoryId() === territoryId ? 4 : 2,
      dashArray: progress > 0 && progress < 100 ? '6 4' : undefined,
    })
  }

  // Repaint existing territory layers to match current store ownership (after a
  // backend re-hydration). New/split territories appear on the next full map
  // load (the territories page); here we reflect ownership flips of what's drawn.
  function repaintTerritories() {
    if (!tb) return
    const uid = tb.currentUserId()
    for (const t of tb.territories())
      paintTerritory(t.id, t.user_id === uid)
  }


  // Live, VISUAL-ONLY feedback while running through enemy territory. The
  // authoritative capture is decided by the backend on stop (closed-loop claim
  // + route-intersection split), then the map is re-hydrated from the API
  // (#943). We no longer flip ownership client-side, which used a different
  // rule (10 proximity pings) and disagreed with the persisted result.
  function checkConquest(lat: number, lng: number) {
    if (!tb || runMode() === 'free') return
    const uid = tb.currentUserId()
    const polys = tb.territoryPolygons()
    const territories = tb.territories()
    const progressMap = { ...captureProgress() }

    for (const t of territories) {
      if (t.user_id === uid) continue
      const poly = polys[t.id]
      if (!poly) continue
      if (!pointInPolygon([lat, lng], poly)) continue

      // Fill the meter as a "you're on enemy turf" cue (capped just under full
      // so the UI doesn't promise a capture the engine hasn't confirmed).
      const pct = Math.min(90, tb.applyCaptureSample(t.id, CAPTURE_SAMPLES_NEEDED))
      progressMap[t.id] = pct
      captureProgress.set(progressMap)
      paintTerritory(t.id, false, pct)
    }
  }

  // altitudeM comes from the GPS (metres, often null on desktop) or, for
  // simulated runs, from the trail's published elevation profile. While paused
  // nothing accrues — no distance, no samples, no capture progress (#960).
  function addRoutePoint(lat: number, lng: number, altitudeM: number | null = null) {
    if (!refs.routeLine || !refs.map) return
    if (paused() || !recording()) return
    const coords = refs.routeCoords
    if (coords.length > 0) {
      const prev = coords[coords.length - 1]
      distance.set(distance() + haversine(prev, [lat, lng]))
    }
    coords.push([lat, lng])

    // Elevation gain: positive altitude deltas above the GPS noise floor (#953).
    const eleFt = altitudeM != null ? altitudeM * METERS_TO_FEET : null
    const prevSample = refs.samples[refs.samples.length - 1]
    if (eleFt != null && prevSample?.eleFt != null) {
      const d = eleFt - prevSample.eleFt
      if (d >= ELEVATION_NOISE_FLOOR_FT)
        elevation.set(Math.round(elevation() + d))
    }
    refs.samples.push({ lat, lng, t: Date.now(), eleFt, movingS: elapsed() })

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
    captureProgress.set({})
    sessionXp.set(0)
    conquestToast.set(null)
    paused.set(false)
    if (tb) tb.resetCaptureSamples()
    refs.routeCoords = []
    refs.samples = []
    refs.startedAtMs = null
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

  async function simulate() {
    if (!tb || !refs.map) return
    const id = selectedTrailId()
    const route = tb.trailRoutes()[id]
    if (!route || route.length < 2) return
    resetRun()
    mode.set('simulated')
    recording.set(true)
    gpsStatus.set('active')
    refs.routeCoords = []
    refs.startedAtMs = Date.now()
    refs.routeLine = await createLiveRouteLine(refs.map, SIM_ROUTE)
    const { Polyline } = await ensureTsMaps()
    const guide = new Polyline(route, { weight: 0, opacity: 0 }).addTo(refs.map)
    refs.map.fitBounds(guide.getBounds(), { padding: [40, 40] })
    refs.map.removeLayer(guide)

    // Simulated elevation comes from the trail's published total gain,
    // distributed monotonically along the route — deterministic, no random
    // values (#953). Converted to metres so addRoutePoint's single GPS-style
    // accumulation path applies to both modes.
    const totalGainFt = tb.findTrail(id)?.elevation ?? 0
    let i = 0
    startTicker()
    refs.simTimer = setInterval(() => {
      if (paused() || !recording()) return
      if (i >= route.length) {
        stop()
        return
      }
      const [lat, lng] = route[i++]
      const syntheticAltM = (totalGainFt * (i / route.length)) / METERS_TO_FEET
      addRoutePoint(lat, lng, syntheticAltM)
    }, 350)
  }

  async function startManual() {
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
    refs.routeLine = await createLiveRouteLine(refs.map, YOURS)

    const beginTracking = (startLat: number, startLng: number, startAltM: number | null) => {
      recording.set(true)
      gpsStatus.set('active')
      refs.startedAtMs = Date.now()
      addRoutePoint(startLat, startLng, startAltM)
      refs.map!.setView([startLat, startLng], 17)
      startTicker()
      refs.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          gpsStatus.set('active')
          addRoutePoint(pos.coords.latitude, pos.coords.longitude, pos.coords.altitude)
          refs.map!.panTo([pos.coords.latitude, pos.coords.longitude])
        },
        () => gpsStatus.set('searching'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
      )
    }

    navigator.geolocation.getCurrentPosition(
      pos => beginTracking(pos.coords.latitude, pos.coords.longitude, pos.coords.altitude),
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

  interface RunMetrics {
    durationStr: string
    movingTimeStr: string
    paceStr: string | null
    splits: MileSplit[]
  }

  // Persist the run to the backend and run the territory engine (closed-loop
  // claim + route-intersection conquest). Fire-and-forget; failures (e.g. the
  // run wasn't a closed loop) are expected and surfaced only on success.
  const persistRun = async (routeSnapshot: LatLng[], trailId: number | null, metrics: RunMetrics): Promise<void> => {
    if (!tb || routeSnapshot.length < 2) return
    try {
      const result = await persistRunAndProcess({
        user_id: tb.currentUserId(),
        trail_id: trailId,
        activity_type: activityType(),
        distance: Number(distance().toFixed(2)),
        duration: metrics.durationStr,
        moving_time: metrics.movingTimeStr,
        pace: metrics.paceStr,
        elevation: elevation(),
        gpx_data: routeToGeoJson(routeSnapshot),
        splits: metrics.splits,
        completed_at: new Date().toISOString(),
      })
      const message = runResultMessage(result)
      if (message) {
        conquestToast.set(message)
        if (refs.toastTimer) clearTimeout(refs.toastTimer)
        refs.toastTimer = setTimeout(() => conquestToast.set(null), 3600)
      }
      // Re-hydrate territories from the backend so the map reflects the real
      // claim/conquest outcome (single source of truth), then repaint.
      if ((result.claim && result.claim.success) || (result.conquest && (result.conquest.conqueredCount ?? 0) > 0)) {
        await loadTerritories(tb)
        repaintTerritories()
      }
    }
    catch (err) {
      console.error('persistRun failed:', err)
    }
  }

  function stop() {
    recording.set(false)
    paused.set(false)
    gpsStatus.set('stopped')
    clearTimers()
    if (distance() > 0 && tb) {
      const trail = mode() === 'simulated' ? tb.findTrail(selectedTrailId()) : null

      // Moving time is the pause-aware ticker; elapsed is wall-clock (#960).
      // Pace derives from moving time, splits from the timestamped samples.
      const movingS = elapsed()
      const wallS = refs.startedAtMs
        ? Math.max(movingS, Math.round((Date.now() - refs.startedAtMs) / 1000))
        : movingS
      const splits = computeSplitsFromSamples(refs.samples)
      const paceStr = distance() > 0.01 ? `${fmtDuration(Math.round(movingS / distance()))}/mi` : null

      // Persist to the backend + run the territory engine using the recorded
      // GPS track (snapshot before it's cleared on the next run).
      void persistRun([...refs.routeCoords], trail?.id ?? null, {
        durationStr: fmtDuration(wallS),
        movingTimeStr: fmtDuration(movingS),
        paceStr,
        splits,
      })
      const captures = conqueredIds().length
      const title = captures > 0
        ? `Capture Run — ${captures} zone${captures > 1 ? 's' : ''} taken`
        : `${activityType()} — ${new Date().toLocaleDateString()}`
      tb.addActivity({
        user_id: tb.currentUserId(),
        userName: 'You',
        trail_id: trail?.id ?? null,
        trail_name: trail?.name ?? `${activityType()} Activity`,
        title,
        activityType: activityType(),
        distance: Number(distance().toFixed(2)),
        duration: fmtDuration(wallS),
        moving_time: fmtDuration(movingS),
        pace: paceStr ?? '--',
        elevation_gain: elevation(),
        calories: Math.round(movingS / 60 * 10),
        heartRateAvg: null,
        heartRateMax: null,
        cadence: null,
        splits,
        kudos_count: 0,
        comments: [],
        hasGps: true,
      })
    }
    mode.set('idle')
  }

  async function initRecordMap() {
    try {
      const store = tb ?? useStore('tb')
      if (!store) return
      refs.mapHandle = await createTrailMap(mapElId, { scrollWheelZoom: true })
      if (!refs.mapHandle) return
      refs.map = refs.mapHandle.map

      const uid = store.currentUserId()
      const polys = store.territoryPolygons()
      const bounds: LatLng[] = []

      for (const t of store.territories()) {
        const poly = polys[t.id]
        if (!poly) continue
        const mine = t.user_id === uid
        const color = mine ? YOURS : ENEMY
        const layer = await drawTerritoryPolygon(refs.map, poly, {
          color,
          fillOpacity: mine ? 0.45 : 0.15,
          weight: targetTerritoryId() === t.id ? 4 : 2,
          popupHtml: `<b>${t.name}</b><br>${mine ? 'Your turf' : 'Enemy turf — run through to capture'}<br>${(t.areaSize / 1000).toFixed(1)} km²`,
          onClick: () => {
            if (!mine && !recording())
              targetTerritoryId.set(t.id)
          },
        })
        refs.territoryLayers[t.id] = layer
        bounds.push(...poly)
      }

      for (const tr of store.trails()) {
        if (!tr.lat || !tr.lng) continue
        const marker = await drawTrailMarker(refs.map, tr.lat, tr.lng, {
          difficulty: tr.difficulty,
          popupHtml: `<b>${tr.name}</b><br>${tr.location}<br>${tr.distance} mi • ${tr.difficulty}`,
          onClick: () => selectedTrailId.set(tr.id),
        })
        refs.trailMarkers[tr.id] = marker
        bounds.push([tr.lat, tr.lng])
      }

      if (bounds.length) refs.mapHandle.fitPoints(bounds, [40, 40])
      else refs.map.setView([37.7749, -122.4194], 5)

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { CircleMarker } = await ensureTsMaps()
            const here = new CircleMarker([pos.coords.latitude, pos.coords.longitude], {
              radius: 8,
              color: '#ffffff',
              weight: 3,
              fillColor: '#3b82f6',
              fillOpacity: 1,
            }).addTo(refs.map!).bindPopup('You are here')
            refs.hereMarker = here
            gpsStatus.set('active')
            refs.map!.setView([pos.coords.latitude, pos.coords.longitude], 14)
          },
          () => gpsStatus.set('searching'),
          { enableHighAccuracy: true },
        )
      }
    }
    catch (err) {
      console.error('record map init failed:', err)
    }
  }

  onDestroy(() => {
    clearTimers()
    if (refs.toastTimer) clearTimeout(refs.toastTimer)
    refs.mapHandle?.destroy()
    refs.mapHandle = null
    refs.map = null
  })

  return {
    recording,
    paused,
    activityType,
    mode,
    elapsed,
    distance,
    elevation,
    gpsStatus,
    selectedTrailId,
    targetTerritoryId,
    conqueredIds,
    captureProgress,
    sessionXp,
    runMode,
    conquestToast,
    trailOptions,
    simulate,
    startManual,
    togglePause,
    stop,
    resetRun,
    mountRecordMap: () => runWhenMapReady(mapElId, initRecordMap),
  }
}
