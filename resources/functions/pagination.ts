/**
 * Shared list-endpoint pagination (#978). Read `offset`/`limit` from the
 * request (clamped), then slice a fully-built result array and emit a
 * consistent `meta: { offset, limit, total, hasMore }`. Auto-imported into the
 * index actions.
 *
 * The actions build + enrich their full result set (joined names, derived
 * stats) and paginate the mapped array, so `total` reflects the real match
 * count regardless of the page. Fine for this app's dataset sizes; for very
 * large tables a DB-level offset/limit + count would be the next step.
 */

export interface PageParams { offset: number, limit: number }
export interface PageMeta { offset: number, limit: number, total: number, hasMore: boolean }

export function readPageParams(
  request: { get: (k: string) => any },
  opts: { defaultLimit?: number, maxLimit?: number } = {},
): PageParams {
  const defaultLimit = opts.defaultLimit ?? 50
  const maxLimit = opts.maxLimit ?? 200
  const rawLimit = Number(request.get('limit'))
  const rawOffset = Number(request.get('offset'))
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), maxLimit) : defaultLimit
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0
  return { offset, limit }
}

export function paginate<T>(rows: T[], page: PageParams): { items: T[], meta: PageMeta } {
  const total = rows.length
  const items = rows.slice(page.offset, page.offset + page.limit)
  return {
    items,
    meta: { offset: page.offset, limit: page.limit, total, hasMore: page.offset + page.limit < total },
  }
}
