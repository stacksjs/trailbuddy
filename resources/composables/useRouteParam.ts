/**
 * Resolve a route parameter (e.g. the `:id` on `/trail/:id`) without depending
 * on any single undocumented router global (#987).
 *
 * The detail pages used to each read a DIFFERENT global directly -
 * `window.__routeParams?.id`, `window.stx?._rp?.id`, `window.__stx_rp?.id` -
 * and silently fell back to id `1` or `0` when that global was absent, so a
 * router change would quietly load the wrong record. This helper tries every
 * known router global, then falls back to the URL path, and returns `null`
 * when it genuinely can't resolve a positive id - letting the page render a
 * real "not found" state instead of a wrong one.
 *
 * Every `[id]` route in the app is shaped `/{base}/{id}`, so the id is always
 * the trailing path segment; that's the pathname fallback.
 */
export function readRouteParam(name = 'id'): number | null {
  if (typeof window === 'undefined')
    return null
  const w = window as any

  // 1) Known/observed router globals, in priority order.
  const fromGlobals = w.__routeParams?.[name] ?? w.stx?._rp?.[name] ?? w.__stx_rp?.[name]
  const fromGlobal = toPositiveInt(fromGlobals)
  if (fromGlobal !== null)
    return fromGlobal

  // 2) Fall back to the last non-empty path segment of the current URL.
  const segments = window.location.pathname.split('/').filter(Boolean)
  return toPositiveInt(segments[segments.length - 1])
}

function toPositiveInt(value: unknown): number | null {
  const n = typeof value === 'string' || typeof value === 'number' ? Number(value) : Number.NaN
  return Number.isInteger(n) && n > 0 ? n : null
}
