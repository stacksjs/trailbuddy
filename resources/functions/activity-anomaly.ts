/**
 * Telling a fabricated track from a recorded one.
 *
 * The physics checks answer "could a person have done this". These answer a
 * different and softer question: "does this look like it came off a GPS
 * receiver". A track drawn on a map and replayed through the recorder passes
 * every physical limit, because whoever drew it chose plausible speeds. What it
 * cannot easily fake is noise.
 *
 * A real receiver reports samples at slightly irregular intervals, an accuracy
 * figure that moves as satellites come and go, and a speed that is never
 * constant for long. A generated one tends to be regular in all three. None of
 * that is proof — a treadmill-flat towpath at steady effort is genuinely
 * regular, and a receiver in an open field genuinely reports a stable accuracy
 * — which is exactly why nothing here rejects anything.
 *
 * These produce a score and a list of reasons for a human to look at. The
 * distinction matters: rejecting on statistics punishes the honest athlete with
 * an unusual run, and the honest athlete is the one who will complain, be
 * right, and stop using the app.
 */

import type { TrackSample } from './activity-integrity'

export interface AnomalySignal {
  /** Stable identifier, so a reviewer can filter and a dashboard can count. */
  code: string
  /** What was observed, in the terms a reviewer thinks in. */
  detail: string
  /** 0–1. Summed and clamped into the score. */
  weight: number
}

export interface AnomalyReport {
  /** 0–1, where 0 is unremarkable. Not a probability — a triage order. */
  score: number
  signals: AnomalySignal[]
}

/** Coefficient of variation: spread relative to size, so it compares across scales. */
function variation(values: number[]): number | null {
  if (values.length < 3)
    return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  if (mean === 0)
    return null
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / Math.abs(mean)
}

export interface AnomalyInput {
  samples: TrackSample[]
  /** Metres per second between consecutive samples. */
  speeds: number[]
  /** Seconds between consecutive samples. */
  intervals: number[]
}

/**
 * Score a track's resemblance to a recording rather than a construction.
 *
 * Every signal here is individually explainable by an unusual but legitimate
 * run. Several together are what a reviewer should see.
 */
export function detectAnomalies(input: AnomalyInput): AnomalyReport {
  const { samples, speeds, intervals } = input
  const signals: AnomalySignal[] = []

  // --- Sampling regularity -------------------------------------------------
  // A receiver asked for a fix every second delivers them a few tens of
  // milliseconds either side. A loop that emits one every exactly 1000 ms is a
  // loop, not a receiver.
  const intervalSpread = variation(intervals)
  if (intervalSpread !== null && intervals.length >= 20 && intervalSpread < 0.01) {
    signals.push({
      code: 'uniform_sample_interval',
      detail: `sample interval varies by ${(intervalSpread * 100).toFixed(2)}% across ${intervals.length} samples`,
      weight: 0.35,
    })
  }

  // --- Speed regularity ----------------------------------------------------
  // Nobody holds a pace this exactly. Cadence, terrain, traffic lights and the
  // receiver's own error all show up here on a real run.
  const speedSpread = variation(speeds)
  if (speedSpread !== null && speeds.length >= 20 && speedSpread < 0.02) {
    signals.push({
      code: 'uniform_speed',
      detail: `speed varies by ${(speedSpread * 100).toFixed(2)}% across the track`,
      weight: 0.35,
    })
  }

  // --- Accuracy regularity -------------------------------------------------
  // Reported accuracy moves as the satellite geometry changes. One value for a
  // whole activity means the value was written, not measured.
  const accuracies = samples
    .map(sample => sample.accuracy)
    .filter((value): value is number => value !== null && Number.isFinite(value))

  if (accuracies.length >= 20) {
    const distinct = new Set(accuracies.map(value => value.toFixed(2)))
    if (distinct.size === 1) {
      signals.push({
        code: 'constant_accuracy',
        detail: `every sample reports accuracy ${accuracies[0]}`,
        weight: 0.4,
      })
    }
    else if (distinct.size <= 3 && accuracies.length >= 60) {
      signals.push({
        code: 'quantised_accuracy',
        detail: `${accuracies.length} samples report only ${distinct.size} distinct accuracy values`,
        weight: 0.2,
      })
    }
  }

  // --- Missing accuracy ----------------------------------------------------
  // Not proof of anything, but a track with no accuracy at all cannot be
  // checked for the things accuracy is checked for.
  if (samples.length >= 20 && accuracies.length === 0) {
    signals.push({
      code: 'no_accuracy_reported',
      detail: 'no sample carries a device accuracy figure',
      weight: 0.25,
    })
  }

  // --- Geometry ------------------------------------------------------------
  // A drawn route is made of long straight legs joined at sharp corners. A run
  // wanders, because roads bend and people do not hold a line.
  const straightness = straightLegRatio(samples)
  if (straightness !== null && samples.length >= 30 && straightness > 0.9) {
    signals.push({
      code: 'unnaturally_straight',
      detail: `${(straightness * 100).toFixed(0)}% of the track lies on near-perfect straight legs`,
      weight: 0.3,
    })
  }

  // --- Altitude ------------------------------------------------------------
  // A phone reports altitude, and it is noisy. A track with a single altitude
  // for its whole length has had one assigned.
  const altitudes = samples
    .map(sample => sample.altitude)
    .filter((value): value is number => value !== null && Number.isFinite(value))
  if (altitudes.length >= 30 && new Set(altitudes.map(value => value.toFixed(1))).size === 1) {
    signals.push({
      code: 'constant_altitude',
      detail: `every sample reports altitude ${altitudes[0]}`,
      weight: 0.2,
    })
  }

  const score = Math.min(1, signals.reduce((sum, signal) => sum + signal.weight, 0))
  return { score, signals }
}

/**
 * How much of the track lies on straight legs.
 *
 * Measured by turn angle at each sample: a run through streets turns
 * constantly, by a degree or two, because neither the road nor the runner is
 * straight. A route drawn between waypoints turns not at all and then turns
 * ninety degrees at once.
 */
function straightLegRatio(samples: TrackSample[]): number | null {
  if (samples.length < 10)
    return null

  let straight = 0
  let counted = 0

  for (let i = 1; i < samples.length - 1; i++) {
    const before = bearing(samples[i - 1], samples[i])
    const after = bearing(samples[i], samples[i + 1])
    if (before === null || after === null)
      continue

    counted++
    let turn = Math.abs(after - before)
    if (turn > 180)
      turn = 360 - turn
    // Under a fifth of a degree is not a turn a person makes; it is a line.
    if (turn < 0.2)
      straight++
  }

  return counted === 0 ? null : straight / counted
}

function bearing(a: { lat: number, lng: number }, b: { lat: number, lng: number }): number | null {
  if (a.lat === b.lat && a.lng === b.lng)
    return null
  const rad = Math.PI / 180
  const dLng = (b.lng - a.lng) * rad
  const lat1 = a.lat * rad
  const lat2 = b.lat * rad
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180) / Math.PI
}

/**
 * A stable fingerprint of a track's shape.
 *
 * Two submissions of the same recording — a replay, a shared file, one athlete
 * uploading another's run — produce the same fingerprint, while two genuine
 * runs of the same route do not, because no two GPS traces agree to five
 * decimal places at every sample.
 *
 * Coordinates are rounded to about a metre before hashing, so re-encoding the
 * same track through a different serialiser still matches. Timing is
 * deliberately excluded: shifting the clock is the first thing anybody replaying
 * a track would do.
 */
export function trackFingerprint(samples: Array<{ lat: number, lng: number }>): string | null {
  if (samples.length < 2)
    return null

  const hasher = new Bun.CryptoHasher('sha256')
  for (const sample of samples) {
    if (!Number.isFinite(sample.lat) || !Number.isFinite(sample.lng))
      continue
    hasher.update(`${sample.lat.toFixed(5)},${sample.lng.toFixed(5)};`)
  }
  return hasher.digest('hex')
}
