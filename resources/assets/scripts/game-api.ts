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
  /** Enemy territories this run attacked without taking land (now 'contested'). */
  contested?: Array<{ id: number, name: string }>
  /** Own contested territories this run defended (back to 'active'). */
  defended?: Array<{ id: number, name: string }>
}

// The browser auth client (@stacksjs/browser) stores the bearer token under
// `auth_token`; reuse the same key so our calls authenticate the same session.
const TOKEN_KEY = 'auth_token'

// Seeded demo athlete ("You" = user id 1). The write endpoints require auth
// (#939), so we transparently sign this user in if there's no session yet —
// keeps the demo frictionless while the backend still derives the acting user
// from the token (never the request body).
const DEMO_EMAIL = 'you@trailbuddy.test'
const DEMO_PASSWORD = 'password123'

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  if (token)
    headers.Authorization = `Bearer ${token}`
  return headers
}

let sessionPromise: Promise<void> | null = null

/**
 * Ensure there's an authenticated session before a write. Idempotent: returns
 * immediately if a token already exists, otherwise signs in the seeded demo
 * user once (deduped across concurrent callers).
 */
export function ensureSession(): Promise<void> {
  if (typeof localStorage === 'undefined')
    return Promise.resolve()
  if (localStorage.getItem(TOKEN_KEY))
    return Promise.resolve()
  if (sessionPromise)
    return sessionPromise
  sessionPromise = (async () => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      })
      if (res.ok) {
        const data = await res.json()
        const token = (data?.data ?? data)?.token
        if (token)
          localStorage.setItem(TOKEN_KEY, token)
      }
    }
    catch {
      // Offline / API down — writes will simply 401 and no-op.
    }
    finally {
      sessionPromise = null
    }
  })()
  return sessionPromise
}

/** Convert recorded [lat, lng] points to a GeoJSON LineString string the engine parses. */
export function routeToGeoJson(points: Array<[number, number]>): string {
  return JSON.stringify({
    type: 'LineString',
    coordinates: points.map(([lat, lng]) => [lng, lat]),
  })
}

export interface ActivityPayload {
  user_id: number
  trail_id?: number | null
  activity_type: string
  distance: number
  /** Wall-clock elapsed time (includes pauses). */
  duration: string
  /** Pause-aware moving time — what pace is computed from (#960). */
  moving_time?: string | null
  pace?: string | null
  elevation?: number
  gpx_data?: string | null
  /** Per-mile splits computed from the GPS samples (#952). */
  splits?: Array<{ mile: number, pace: string, elev: number }>
  notes?: string
  completed_at?: string
}

/** Persist a recorded run as an Activity. Returns the created activity (with id). */
export async function createActivity(payload: ActivityPayload): Promise<CreatedActivity | null> {
  await ensureSession()
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

export interface ActivityUpdatePayload {
  activity_type?: string
  notes?: string | null
  trail_id?: number | null
  // Measured fields — the API only accepts these for manual (non-GPS) entries.
  distance?: number
  duration?: string
  moving_time?: string
  pace?: string
  elevation?: number
  completed_at?: string
}

/** Edit an activity (owner only). Returns { success, activity?, error? }. */
export async function updateActivity(activityId: number, payload: ActivityUpdatePayload): Promise<{ success: boolean, activity?: any, error?: string }> {
  await ensureSession()
  const res = await fetch(`/api/activities/${activityId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  try {
    return await res.json()
  }
  catch {
    return { success: false, error: `HTTP ${res.status}` }
  }
}

/** Delete an activity (owner only). Kudos/comments cascade; territory stays. */
export async function deleteActivity(activityId: number): Promise<boolean> {
  await ensureSession()
  const res = await fetch(`/api/activities/${activityId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  return res.ok
}

export interface ActivityComment {
  id: number
  userId: number
  userName: string
  body: string
  createdAt: string
}

/** Fetch a single activity (incl. parsed route + comments). */
export async function fetchActivityDetail(activityId: number): Promise<any | null> {
  const res = await fetch(`/api/activities/${activityId}`)
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.activity ?? null
}

/** Post a comment on an activity; returns the created comment. */
export async function postComment(activityId: number, userId: number, body: string): Promise<ActivityComment | null> {
  await ensureSession()
  const res = await fetch(`/api/activities/${activityId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ user_id: userId, body }),
  })
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.comment ?? null
}

export interface KudosResult {
  success: boolean
  kudosed?: boolean
  kudosCount?: number
}

/** Toggle the user's kudos on an activity; returns the authoritative count. */
export async function toggleKudos(activityId: number, userId: number): Promise<KudosResult> {
  await ensureSession()
  const res = await fetch(`/api/activities/${activityId}/kudos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ user_id: userId }),
  })
  return res.json()
}

export interface FollowsResult {
  followerCount: number
  followingCount: number
  followerIds: number[]
  followingIds: number[]
}

/** Fetch the current user's notifications (auth). */
export async function fetchNotifications(): Promise<{ notifications: any[], unreadCount: number } | null> {
  await ensureSession()
  const res = await fetch('/api/notifications', { headers: authHeaders() })
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.success ? json : null
}

/** Mark notifications read (all, or a single id). */
export async function markNotificationsRead(id?: number): Promise<boolean> {
  await ensureSession()
  const res = await fetch('/api/notifications/read', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(id ? { id } : {}),
  })
  return res.ok
}

export interface TrailReview {
  id: number
  userId: number
  userName: string
  rating: number
  title: string | null
  content: string
  conditions: string | null
  visitDate: string | null
  createdAt: string
}

/** Fetch a trail's reviews (author names joined, newest first) (#981). */
export async function fetchTrailReviews(trailId: number): Promise<TrailReview[] | null> {
  const res = await fetch(`/api/trails/${trailId}/reviews`)
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.success ? json.reviews : null
}

/** Create or update the session user's review of a trail (#981). */
export async function postTrailReview(trailId: number, payload: { rating: number, content: string, conditions?: string | null, title?: string | null }): Promise<{ success: boolean, review?: any, trail?: { id: number, rating: number, reviewCount: number }, updated?: boolean, error?: string, fields?: Record<string, string> }> {
  await ensureSession()
  const res = await fetch(`/api/trails/${trailId}/reviews`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  try {
    return await res.json()
  }
  catch {
    return { success: false, error: `HTTP ${res.status}` }
  }
}

/** Toggle the session user's saved/bookmark state for a trail (#969). */
export async function toggleSaveTrail(trailId: number): Promise<{ success: boolean, saved?: boolean }> {
  await ensureSession()
  const res = await fetch(`/api/trails/${trailId}/save`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  })
  if (!res.ok)
    return { success: false }
  return res.json()
}

/** Fetch a user's saved trails (with trail summaries) (#969). */
export async function fetchSavedTrails(userId: number): Promise<{ savedTrails: any[] } | null> {
  const res = await fetch(`/api/users/${userId}/saved-trails`)
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.success ? json : null
}

export interface AthleteSearchResult {
  id: number
  name: string
  activityCount: number
  followerCount: number
  territoriesOwned: number
  totalAreaOwned: number
}

/** Search athletes by name; empty/short query returns a discover list (#971). */
export async function searchAthletes(q: string): Promise<AthleteSearchResult[] | null> {
  const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.success ? json.athletes : null
}

/** Fetch achievement definitions merged with a user's progress (#982). */
export async function fetchAchievements(userId: number): Promise<{ achievements: any[], meta: any } | null> {
  const res = await fetch(`/api/users/${userId}/achievements`)
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.success ? json : null
}

/** Fetch a public athlete profile (identity, stats, social counts, recent activities). */
export async function fetchAthlete(userId: number): Promise<any | null> {
  const res = await fetch(`/api/users/${userId}`)
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.success ? json : null
}

/** Fetch a user's social graph (counts + id lists). Public read. */
export async function fetchFollows(userId: number): Promise<FollowsResult | null> {
  const res = await fetch(`/api/users/${userId}/follows`)
  if (!res.ok)
    return null
  const json = await res.json()
  return json?.success ? json : null
}

/** Follow/unfollow a user; returns the new state + the target's follower count. */
export async function toggleFollow(targetId: number): Promise<{ success: boolean, following?: boolean, followerCount?: number }> {
  await ensureSession()
  const res = await fetch(`/api/users/${targetId}/follow`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  })
  return res.json()
}

/** Claim a new territory from a completed closed-loop activity. */
export async function claimTerritory(activityId: number, userId: number): Promise<ClaimResult> {
  await ensureSession()
  const res = await fetch('/api/territories/claim', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ activity_id: activityId, user_id: userId }),
  })
  return res.json()
}

/** Process conquests for an activity that ran through enemy territory. */
export async function processConquest(activityId: number, userId: number): Promise<ConquestResult> {
  await ensureSession()
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
export async function persistRunAndProcess(payload: ActivityPayload): Promise<RunResult> {
  const activity = await createActivity(payload)
  if (!activity)
    return { activityId: null }
  const claim = await claimTerritory(activity.id, payload.user_id)
  const conquest = await processConquest(activity.id, payload.user_id)
  return { activityId: activity.id, claim, conquest }
}

/** Build a short toast message from a run result, or null if nothing happened. */
export function runResultMessage(result: RunResult): string | null {
  const parts: string[] = []

  const count = result.conquest?.conqueredCount ?? 0
  if (count > 0) {
    const plural = count > 1 ? 'territories' : 'territory'
    parts.push(`Conquered ${count} ${plural}!`)
  }

  const defended = result.conquest?.defended ?? []
  if (defended.length > 0)
    parts.push(`Defended ${defended.map(d => d.name).join(', ')}!`)

  if (result.claim?.success && result.claim.territory) {
    const km2 = (result.claim.territory.areaSize / 1000000).toFixed(2)
    parts.push(`Claimed new territory — ${km2} km²!`)
  }

  const contested = result.conquest?.contested ?? []
  if (contested.length > 0)
    parts.push(`Attacked ${contested.map(c => c.name).join(', ')} — run through to conquer!`)

  return parts.length ? parts.join(' ') : null
}
