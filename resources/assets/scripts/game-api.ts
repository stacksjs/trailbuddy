/**
 * Minimal fetch client for the territory game endpoints.
 *
 * Calls hit the relative `/api/*` paths, which the frontend dev server proxies
 * to the API server (see serve.ts). Routes are auto-prefixed with `/api`.
 *
 * Keys are snake_case to match the backend Actions / ORM.
 */

export interface CreatedActivity {
  id: number
  userId: number
  activityType: string
  distance: number
  hasGps: boolean
}

export interface ClaimResult {
  success: boolean
  error?: string
  territory?: { id: number, name: string, areaSize: number, centerLat: number, centerLng: number }
}

export interface ConquestResult {
  success: boolean
  error?: string
  conqueredCount?: number
  territories?: Array<{ originalId: number, conqueredArea: number, remainingArea: number, newTerritoryId?: number }>
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null
  if (token)
    headers.Authorization = `Bearer ${token}`
  return headers
}

/** Convert recorded [lat, lng] points to a GeoJSON LineString string the engine parses. */
export function routeToGeoJson(points: Array<[number, number]>): string {
  return JSON.stringify({
    type: 'LineString',
    coordinates: points.map(([lat, lng]) => [lng, lat]),
  })
}

/** Persist a recorded run as an Activity. Returns the created activity (with id). */
export async function createActivity(payload: {
  user_id: number
  trail_id?: number | null
  activity_type: string
  distance: number
  duration: string
  pace?: string | null
  elevation?: number
  gpx_data?: string | null
  completed_at?: string
}): Promise<CreatedActivity | null> {
  const res = await fetch('/api/activities', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.activity ?? null
}

export interface KudosResult {
  success: boolean
  kudosed?: boolean
  kudosCount?: number
}

/** Toggle the user's kudos on an activity; returns the authoritative count. */
export async function toggleKudos(activityId: number, userId: number): Promise<KudosResult> {
  const res = await fetch(`/api/activities/${activityId}/kudos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ user_id: userId }),
  })
  return res.json()
}

/** Claim a new territory from a completed closed-loop activity. */
export async function claimTerritory(activityId: number, userId: number): Promise<ClaimResult> {
  const res = await fetch('/api/territories/claim', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ activity_id: activityId, user_id: userId }),
  })
  return res.json()
}

/** Process conquests for an activity that ran through enemy territory. */
export async function processConquest(activityId: number, userId: number): Promise<ConquestResult> {
  const res = await fetch('/api/territories/process-conquest', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ activity_id: activityId, user_id: userId }),
  })
  return res.json()
}

export interface RunResult {
  activityId: number | null
  claim?: ClaimResult
  conquest?: ConquestResult
}

/**
 * Persist a recorded run and run the territory engine end-to-end: create the
 * Activity, then attempt a closed-loop claim and a route-intersection conquest.
 */
export async function persistRunAndProcess(payload: {
  user_id: number
  trail_id?: number | null
  activity_type: string
  distance: number
  duration: string
  pace?: string | null
  elevation?: number
  gpx_data?: string | null
  completed_at?: string
}): Promise<RunResult> {
  const activity = await createActivity(payload)
  if (!activity)
    return { activityId: null }
  const claim = await claimTerritory(activity.id, payload.user_id)
  const conquest = await processConquest(activity.id, payload.user_id)
  return { activityId: activity.id, claim, conquest }
}

/** Build a short toast message from a run result, or null if nothing happened. */
export function runResultMessage(result: RunResult): string | null {
  const count = result.conquest?.conqueredCount ?? 0
  if (count > 0) {
    const plural = count > 1 ? 'territories' : 'territory'
    return `Conquered ${count} ${plural}!`
  }
  if (result.claim?.success && result.claim.territory) {
    const km2 = (result.claim.territory.areaSize / 1000000).toFixed(2)
    return `Claimed new territory — ${km2} km²!`
  }
  return null
}
