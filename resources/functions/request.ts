/**
 * Harness-only acting-user fallback for PUBLIC reads (#964 security fix).
 *
 * Auth-protected routes can safely fall back to a body `user_id` because the
 * auth middleware guarantees `Auth.user()` succeeds over HTTP, so the body
 * fallback is only ever reached by the in-process verification harness. PUBLIC
 * routes have no such guarantee — an anonymous HTTP caller could pass
 * `?user_id=<someone>` and be treated as that user, spoofing identity-driven
 * filtering (e.g. private-club visibility).
 *
 * This helper returns the body `user_id` ONLY when there is no real HTTP
 * request context. The harness passes a bare `{ get }` stub; a real
 * EnhancedRequest always carries `url`/`headers`/`query`. So over HTTP this
 * returns null (never spoofable), while the harness still gets its fallback.
 */
export function harnessFallbackUserId(request: any, key = 'user_id'): number | null {
  const isHttpRequest = !!(request
    && (request.url !== undefined || request.headers !== undefined || request.query !== undefined))
  if (isHttpRequest)
    return null
  const raw = request?.get?.(key)
  const n = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : Number.NaN
  return Number.isInteger(n) && n > 0 ? n : null
}
