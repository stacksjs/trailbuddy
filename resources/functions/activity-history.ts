/**
 * Checks that need more than the activity in front of you.
 *
 * A fabricated track can be internally perfect and still impossible in
 * context. One athlete cannot be running in two places at once, cannot finish
 * in Berlin and start in Tokyo eleven minutes later, and cannot legitimately
 * submit a trace somebody has already submitted.
 *
 * None of that is visible to a check that looks only at the samples, which is
 * why these are separate: they take the athlete's other activities as input.
 * They are pure functions over that input so the rules can be tested without a
 * database, and so the query that feeds them stays in one place where its
 * indexes can be seen.
 */

export interface NeighbouringActivity {
  id: number
  /** Epoch milliseconds. */
  startedAt: number | null
  completedAt: number | null
  /** Where the track began and ended, when known. */
  startLat: number | null
  startLng: number | null
  endLat: number | null
  endLng: number | null
  /** From `trackFingerprint`. */
  fingerprint: string | null
  /** Whether it counted for the game. A rejected neighbour is weaker evidence. */
  captureEligible: boolean
}

export interface HistoryCandidate {
  startedAt: number | null
  completedAt: number | null
  startLat: number | null
  startLng: number | null
  endLat: number | null
  endLng: number | null
  fingerprint: string | null
}

export interface HistoryFinding {
  code: 'overlapping_activity' | 'impossible_transit' | 'duplicate_track'
  detail: string
  /** The activity this conflicts with. */
  conflictsWith: number
  /**
   * Whether this is grounds for refusing the capture outright.
   *
   * Two of the three are: a duplicate trace and a genuine overlap in time are
   * not things that happen to an honest athlete. Transit between activities is
   * softer — a phone's clock can be wrong, and a flight is a legitimate way to
   * be somewhere else — so it is flagged for review rather than refused.
   */
  disqualifying: boolean
}

const EARTH_RADIUS = 6371000

function haversine(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad
  const dLng = (bLng - aLng) * rad
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * The fastest anyone gets between two points, in metres per second.
 *
 * Set at roughly the cruising speed of an airliner. The point is not to model
 * travel — it is to catch a claim that would need teleportation, without
 * accusing anybody who caught a flight between two runs.
 */
const MAX_TRANSIT_SPEED = 280

/**
 * Compare a new activity against the athlete's neighbouring ones.
 *
 * `neighbours` should be the activities whose time window is anywhere near the
 * candidate's, plus any sharing its fingerprint. Everything else is irrelevant
 * and expensive to consider.
 */
export function checkAgainstHistory(
  candidate: HistoryCandidate,
  neighbours: NeighbouringActivity[],
): HistoryFinding[] {
  const findings: HistoryFinding[] = []

  for (const other of neighbours) {
    // --- The same trace twice ---------------------------------------------
    // No two recordings of the same route agree to five decimal places at every
    // sample, so a match is a replay: the athlete's own, or somebody else's.
    if (candidate.fingerprint && other.fingerprint && candidate.fingerprint === other.fingerprint) {
      findings.push({
        code: 'duplicate_track',
        detail: `identical GPS trace to activity ${other.id}`,
        conflictsWith: other.id,
        disqualifying: true,
      })
      continue
    }

    // --- Being in two places ----------------------------------------------
    const overlap = overlapSeconds(candidate, other)
    if (overlap !== null && overlap > 60) {
      findings.push({
        code: 'overlapping_activity',
        detail: `overlaps activity ${other.id} by ${Math.round(overlap / 60)} minutes`,
        conflictsWith: other.id,
        // Only when the other one counted. Two recorders left running, or a
        // watch and a phone recording the same outing, produce an overlap that
        // is honest — but only one of them can be scored, and the other has
        // already been.
        disqualifying: other.captureEligible,
      })
      continue
    }

    // --- Getting there ------------------------------------------------------
    const transit = transitDemand(candidate, other)
    if (transit && transit.speed > MAX_TRANSIT_SPEED) {
      findings.push({
        code: 'impossible_transit',
        detail: `${Math.round(transit.distance / 1000)} km from activity ${other.id} in ${Math.round(transit.seconds / 60)} minutes`,
        conflictsWith: other.id,
        disqualifying: false,
      })
    }
  }

  return findings
}

/** Seconds two activities share, or null when either has no window. */
function overlapSeconds(a: HistoryCandidate, b: NeighbouringActivity): number | null {
  if (a.startedAt === null || a.completedAt === null || b.startedAt === null || b.completedAt === null)
    return null

  const start = Math.max(a.startedAt, b.startedAt)
  const end = Math.min(a.completedAt, b.completedAt)
  return end <= start ? null : (end - start) / 1000
}

/** How fast the athlete would have had to travel between the two. */
function transitDemand(
  a: HistoryCandidate,
  b: NeighbouringActivity,
): { distance: number, seconds: number, speed: number } | null {
  // Whichever finished first is the one travelled from.
  const [first, second] = (a.completedAt ?? 0) <= (b.startedAt ?? 0)
    ? [
        { at: a.completedAt, lat: a.endLat, lng: a.endLng },
        { at: b.startedAt, lat: b.startLat, lng: b.startLng },
      ]
    : [
        { at: b.completedAt, lat: b.endLat, lng: b.endLng },
        { at: a.startedAt, lat: a.startLat, lng: a.startLng },
      ]

  if (first.at === null || second.at === null)
    return null
  if (first.lat === null || first.lng === null || second.lat === null || second.lng === null)
    return null

  const seconds = (second.at - first.at) / 1000
  if (seconds <= 0)
    return null

  const distance = haversine(first.lat, first.lng, second.lat, second.lng)
  // Under a kilometre apart is never interesting, however tight the timing —
  // and it is where GPS error lives.
  if (distance < 1000)
    return null

  return { distance, seconds, speed: distance / seconds }
}
