/**
 * Garmin Activity API: the pure parts.
 *
 * Everything here is a plain function over plain data so the tricky bits (unit
 * conversion, PKCE, deciding which Garmin activity types we even accept) can
 * be tested without a Garmin account, a network, or a database.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** An activity summary as Garmin pushes it. Only the fields we consume. */
export interface GarminActivitySummary {
  /** Stable across redeliveries of the same activity. Our idempotency key. */
  summaryId: string
  activityId?: number
  userId?: string
  activityType?: string
  activityName?: string
  startTimeInSeconds?: number
  startTimeOffsetInSeconds?: number
  durationInSeconds?: number
  distanceInMeters?: number
  activeKilocalories?: number
  averageHeartRateInBeatsPerMinute?: number
  maxHeartRateInBeatsPerMinute?: number
  averageSpeedInMetersPerSecond?: number
  totalElevationGainInMeters?: number
  startingLatitudeInDegree?: number
  startingLongitudeInDegree?: number
  steps?: number
  deviceName?: string
  /** Garmin marks a manually entered activity; it carries no GPS worth importing. */
  manual?: boolean
  /** A multisport parent wraps its children, which arrive as their own summaries. */
  isParent?: boolean
  parentSummaryId?: string
}

/**
 * Garmin's activity types mapped onto the four WildLoop records.
 *
 * Garmin publishes well over a hundred types, most of which are not a trail
 * activity (POOL_SWIMMING, YOGA, INDOOR_CARDIO). Mapping only what belongs
 * here, and skipping the rest, keeps someone's feed about where they went
 * rather than everything their watch happened to record.
 */
const ACTIVITY_TYPES: Record<string, string> = {
  RUNNING: 'Trail Run',
  TRAIL_RUNNING: 'Trail Run',
  TREADMILL_RUNNING: 'Trail Run',
  INDOOR_RUNNING: 'Trail Run',
  OBSTACLE_RUN: 'Trail Run',
  ULTRA_RUN: 'Trail Run',
  VIRTUAL_RUN: 'Trail Run',
  HIKING: 'Hike',
  MOUNTAINEERING: 'Hike',
  WALKING: 'Walk',
  CASUAL_WALKING: 'Walk',
  SPEED_WALKING: 'Walk',
  CYCLING: 'Bike',
  ROAD_BIKING: 'Bike',
  MOUNTAIN_BIKING: 'Bike',
  GRAVEL_CYCLING: 'Bike',
  CYCLOCROSS: 'Bike',
  INDOOR_CYCLING: 'Bike',
  VIRTUAL_RIDE: 'Bike',
}

const METERS_PER_MILE = 1609.344
const FEET_PER_METER = 3.280839895

/**
 * The WildLoop activity type for a Garmin type, or null when it is not
 * something this app records.
 *
 * Returning null rather than defaulting to 'Trail Run' is deliberate: a yoga
 * session filed as a trail run is worse than one not imported at all, because
 * it silently corrupts totals and leaderboards.
 */
export function toActivityType(garminType?: string): string | null {
  if (!garminType)
    return null
  return ACTIVITY_TYPES[garminType.toUpperCase()] ?? null
}

/** Format seconds the way the Activity model stores duration: H:MM:SS, or MM:SS under an hour. */
export function toDurationString(totalSeconds?: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds ?? 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * Pace as MM:SS per mile.
 *
 * Returns null for a zero-distance or zero-duration activity rather than
 * Infinity or NaN, either of which would render as garbage in the feed.
 */
export function toPacePerMile(distanceMeters?: number, durationSeconds?: number): string | null {
  const miles = (distanceMeters ?? 0) / METERS_PER_MILE
  const seconds = durationSeconds ?? 0
  if (miles <= 0 || seconds <= 0)
    return null

  const perMile = Math.round(seconds / miles)
  // A pace beyond ~99 minutes per mile is a stopped watch, not a walk.
  if (perMile > 99 * 60)
    return null

  return `${Math.floor(perMile / 60)}:${String(perMile % 60).padStart(2, '0')}`
}

export interface MappedActivity {
  activity_type: string
  distance: number
  duration: string
  moving_time: string | null
  pace: string | null
  elevation: number
  notes: string | null
  completed_at: string
  visibility: string
}

/**
 * Turn a Garmin summary into the row the Activity model expects, or null when
 * the activity is not one WildLoop records.
 *
 * Units are converted here because the model stores miles and feet (matching
 * what the UI labels), while Garmin reports metres throughout. Getting that
 * backwards would not error anywhere - it would just quietly log a 5 km run as
 * a 5 mile one.
 */
export function mapActivity(summary: GarminActivitySummary): MappedActivity | null {
  const activityType = toActivityType(summary.activityType)
  if (!activityType)
    return null

  // A multisport parent duplicates distance already counted by its children.
  if (summary.isParent)
    return null

  const durationSeconds = summary.durationInSeconds ?? 0
  const distanceMeters = summary.distanceInMeters ?? 0

  const startSeconds = summary.startTimeInSeconds ?? 0
  // Garmin timestamps are UTC with the local offset alongside. Record the
  // moment it finished, in UTC, so activities from a trip abroad still sort
  // correctly against the ones at home.
  const completedAt = new Date((startSeconds + durationSeconds) * 1000)

  const notes = [
    summary.activityName,
    summary.deviceName ? `Recorded on ${summary.deviceName}` : null,
    summary.averageHeartRateInBeatsPerMinute ? `Avg HR ${summary.averageHeartRateInBeatsPerMinute} bpm` : null,
  ].filter(Boolean).join(' · ') || null

  return {
    activity_type: activityType,
    distance: Number((distanceMeters / METERS_PER_MILE).toFixed(2)),
    duration: toDurationString(durationSeconds),
    moving_time: durationSeconds > 0 ? toDurationString(durationSeconds) : null,
    pace: toPacePerMile(distanceMeters, durationSeconds),
    elevation: Math.round((summary.totalElevationGainInMeters ?? 0) * FEET_PER_METER),
    notes,
    completed_at: completedAt.toISOString(),
    // Imports are private until the athlete decides otherwise. A sync that
    // silently publishes someone's movements to a public feed is not a
    // default anyone would choose.
    visibility: 'private',
  }
}

/** A PKCE verifier and its S256 challenge. */
export interface PkcePair {
  verifier: string
  challenge: string
}

/**
 * Create a PKCE pair.
 *
 * The verifier stays on our server; only its SHA-256 hash travels to Garmin.
 * The authorization code comes back through the athlete's browser, so anyone
 * able to read it there still cannot redeem it without the verifier.
 */
export function createPkcePair(): PkcePair {
  // 64 bytes of base64url is 86 characters, inside RFC 7636's 43-128 range.
  const verifier = randomBytes(64).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

/** Build the URL the athlete is sent to in order to approve the connection. */
export function buildAuthorizeUrl(options: {
  authorizeEndpoint: string
  clientId: string
  redirectUri: string
  state: string
  challenge: string
  scope?: string
}): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    response_type: 'code',
    redirect_uri: options.redirectUri,
    code_challenge: options.challenge,
    code_challenge_method: 'S256',
    state: options.state,
  })
  if (options.scope)
    params.set('scope', options.scope)

  return `${options.authorizeEndpoint}?${params.toString()}`
}

/**
 * Is the integration usable?
 *
 * Checked before anything starts a flow, so an athlete gets "not available
 * yet" instead of a Garmin error page about an unknown client id.
 */
export function isConfigured(config: { clientId?: string, clientSecret?: string }): boolean {
  return Boolean(config?.clientId && config?.clientSecret)
}

/**
 * Pull activity summaries out of a push payload.
 *
 * Garmin posts `{ activities: [...] }`, and has historically also posted a
 * bare array. Accepting both costs nothing and avoids dropping a day of
 * activities over a shape we did not anticipate.
 */
export function extractSummaries(body: unknown): GarminActivitySummary[] {
  const candidates = Array.isArray(body)
    ? body
    : Array.isArray((body as any)?.activities)
      ? (body as any).activities
      : Array.isArray((body as any)?.activityDetails)
        ? (body as any).activityDetails
        : []

  return candidates.filter((entry: any) => entry && typeof entry.summaryId === 'string')
}

/** What has to survive the round trip to Garmin and back. */
export interface OAuthState {
  /** Which WildLoop account is connecting. */
  userId: number
  /** Echoed by Garmin, compared on return: the CSRF guard. */
  state: string
  /** Redeems the authorization code. Never leaves our side. */
  verifier: string
  /** Unix ms. A stale attempt is refused rather than resumed. */
  issuedAt: number
}

/** How long an in-flight connection attempt stays valid. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

/**
 * Seal the in-flight OAuth state into a token safe to hand to a browser.
 *
 * This rides in an HttpOnly cookie because the callback is a top-level
 * redirect from Garmin, which carries no Authorization header - so the cookie
 * is the only thing that says who was connecting.
 *
 * It is signed, not merely hidden. Without the signature someone could edit
 * the `userId` in their own cookie and attach their watch to another person's
 * account, which is an account-takeover-shaped hole rather than a mix-up.
 */
export function sealOAuthState(state: OAuthState, secret: string): string {
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

/**
 * Open a sealed state, or return null if it was tampered with, malformed, or
 * has expired. Null always means "start again", never "trust it anyway".
 */
export function openOAuthState(token: string | undefined, secret: string, now = Date.now()): OAuthState | null {
  if (!token || !secret)
    return null

  const separator = token.lastIndexOf('.')
  if (separator === -1)
    return null

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')

  // Constant-time: a byte-by-byte compare leaks how much of a forged
  // signature was correct, which is enough to construct one.
  const given = Buffer.from(signature)
  const want = Buffer.from(expected)
  if (given.length !== want.length || !timingSafeEqual(given, want))
    return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState
    if (typeof parsed?.userId !== 'number' || typeof parsed?.verifier !== 'string' || typeof parsed?.state !== 'string')
      return null
    if (!parsed.issuedAt || now - parsed.issuedAt > OAUTH_STATE_TTL_MS)
      return null
    return parsed
  }
  catch {
    return null
  }
}

/**
 * Does a webhook request carry the shared secret?
 *
 * The push endpoint is a public URL that writes activities, so it has to
 * establish that a request is Garmin's before trusting a word of it.
 * Constant-time for the same reason as above.
 */
export function isAuthenticWebhook(presented: string | null | undefined, secret: string): boolean {
  if (!secret || !presented)
    return false
  const given = Buffer.from(presented)
  const want = Buffer.from(secret)
  return given.length === want.length && timingSafeEqual(given, want)
}
