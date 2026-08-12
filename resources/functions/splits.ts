/**
 * Per-mile split + elevation-gain math from recorded GPS samples (#952, #953).
 *
 * Pure functions - no DOM/model access - used by the recorder (live) and
 * testable in isolation. Pace is computed from MOVING time (#960): each
 * sample carries the recorder's moving-seconds counter, which does not
 * advance while paused, so pause gaps never inflate a split.
 */

export interface RecorderSample {
  lat: number
  lng: number
  /** Wall-clock epoch ms when the sample was recorded. */
  t: number
  /** Altitude in feet (converted from the GPS metres), or null if unavailable. */
  eleFt: number | null
  /** The recorder's moving-time counter (seconds) at this sample. */
  movingS: number
  /** Horizontal accuracy radius from the Geolocation API, in metres. */
  accuracy?: number | null
}

export interface MileSplit {
  mile: number
  pace: string
  elev: number
}

/** Ignore altitude jitter below this (GPS vertical noise is metres-scale). */
export const ELEVATION_NOISE_FLOOR_FT = 3

export const METERS_TO_FEET = 3.28084

/** Include a trailing partial split only if it covers at least this distance. */
const MIN_PARTIAL_SPLIT_MILES = 0.1

function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8
  const dLat = (bLat - aLat) * Math.PI / 180
  const dLng = (bLng - aLng) * Math.PI / 180
  const lat1 = aLat * Math.PI / 180
  const lat2 = bLat * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function fmtPace(secondsPerMile: number): string {
  const s = Math.max(0, Math.round(secondsPerMile))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * Total elevation gain (ft): the sum of positive altitude deltas above the
 * noise floor. Samples without altitude are skipped (no interpolation).
 */
export function totalElevationGainFt(samples: Array<Pick<RecorderSample, 'eleFt'>>): number {
  let gain = 0
  let prev: number | null = null
  for (const s of samples) {
    if (s.eleFt == null)
      continue
    if (prev != null) {
      const d = s.eleFt - prev
      if (d >= ELEVATION_NOISE_FLOOR_FT)
        gain += d
    }
    prev = s.eleFt
  }
  return Math.round(gain)
}

/**
 * Per-mile splits from recorded samples. Pace comes from the moving-time
 * deltas (interpolated at the exact mile boundary); elevation is the gain
 * accumulated within that mile. A trailing partial of ≥ 0.1 mi is included
 * with its pace normalized to per-mile.
 */
export function computeSplitsFromSamples(samples: RecorderSample[]): MileSplit[] {
  if (samples.length < 2)
    return []

  const splits: MileSplit[] = []
  let cumMiles = 0
  let mileStartMovingS = samples[0].movingS
  let mileGainFt = 0
  let prevEleFt = samples[0].eleFt
  let mile = 1

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const cur = samples[i]
    let segMiles = haversineMiles(prev.lat, prev.lng, cur.lat, cur.lng)
    let segStartMovingS = prev.movingS
    let segStartMiles = cumMiles

    if (cur.eleFt != null && prevEleFt != null) {
      const d = cur.eleFt - prevEleFt
      if (d >= ELEVATION_NOISE_FLOOR_FT)
        mileGainFt += d
    }
    if (cur.eleFt != null)
      prevEleFt = cur.eleFt

    // A single segment can cross one or more mile boundaries.
    while (segStartMiles + segMiles >= mile) {
      const milesToBoundary = mile - segStartMiles
      const frac = segMiles > 0 ? milesToBoundary / segMiles : 0
      const boundaryMovingS = segStartMovingS + (cur.movingS - segStartMovingS) * frac

      splits.push({
        mile,
        pace: fmtPace(boundaryMovingS - mileStartMovingS),
        elev: Math.round(mileGainFt),
      })

      mileStartMovingS = boundaryMovingS
      mileGainFt = 0
      segStartMiles = mile
      segStartMovingS = boundaryMovingS
      segMiles -= milesToBoundary
      mile++
    }

    cumMiles = segStartMiles + segMiles
  }

  const partialMiles = cumMiles - (mile - 1)
  if (partialMiles >= MIN_PARTIAL_SPLIT_MILES) {
    const partialMovingS = samples[samples.length - 1].movingS - mileStartMovingS
    splits.push({
      mile,
      pace: fmtPace(partialMovingS / partialMiles),
      elev: Math.round(mileGainFt),
    })
  }

  return splits
}
