import type { LatLng, UiTrail } from '../assets/scripts/trail-data'
import { onMount, state } from 'stx'
import {
  normalizeTrailsPayload,
  routesFromTrails,
} from '../assets/scripts/trail-data'

interface TrailStoreLike {
  trails: () => unknown[]
  hydrateTrailsFromApi: (trails: unknown[], routes: Record<number, [number, number][]>) => void
}

export interface CoverageState {
  total: number
  states: Array<{ code: string, name: string, count: number }>
  sources: Array<{ source: string, count: number }>
}

export interface TrailQuery {
  q?: string
  state?: string
  difficulty?: string
  routeType?: string
  sort?: string
  limit?: number
  offset?: number
}

export interface TrailQueryResult {
  trails: UiTrail[]
  geometryById: Record<number, LatLng[]>
  total: number
  hasMore: boolean
}

export const catalogLoading = state(false)
export const catalogLoaded = state(false)
export const catalogError = state<string | null>(null)
export const catalogSource = state<'api' | 'seed'>('seed')

export const EMPTY_COVERAGE: CoverageState = { total: 0, states: [], sources: [] }

/**
 * National coverage, straight from the catalog.
 *
 * Fetched per page rather than shared through this module's state. Each stx
 * page bundles its client script separately, so a module-level signal set by
 * the layout is a *different* signal from the one a page reads: cross-bundle
 * sharing only works through `window.__composables`, and that bundle currently
 * dies on load (`useRecorder`'s relative imports survive into a non-module
 * IIFE). Fetching per page is a few hundred bytes over the wire, cached by the
 * action for a minute, and correct no matter how the bundling resolves.
 */
export async function fetchCoverage(): Promise<CoverageState> {
  try {
    const res = await fetch('/api/trails/stats')
    if (!res.ok)
      return EMPTY_COVERAGE

    const stats = await res.json()
    if (!stats?.success)
      return EMPTY_COVERAGE

    return {
      total: Number(stats.total) || 0,
      states: Array.isArray(stats.states) ? stats.states : [],
      sources: Array.isArray(stats.sources) ? stats.sources : [],
    }
  }
  catch {
    return EMPTY_COVERAGE
  }
}

let catalogStarted = false

/**
 * Hydrate the store with a first page of trails, and load coverage.
 *
 * The catalog is national now, so this deliberately does NOT try to load
 * everything: it seeds the map and the store with a usable first page and
 * leaves the rest to `queryTrails`, which searches server-side. Pulling the
 * whole table into the browser was viable at 12 trails and is not at 40,000.
 */
export function useTrailCatalog(wl: TrailStoreLike | null) {
  onMount(async () => {
    if (!wl || catalogStarted)
      return
    catalogStarted = true
    catalogLoading.set(true)
    catalogError.set(null)

    try {
      const listRes = await fetch('/api/trails?limit=200&sort=featured')
      if (!listRes.ok)
        throw new Error(`Trails API returned ${listRes.status}`)

      const payload = await listRes.json()
      const { trails, geometryById } = normalizeTrailsPayload(payload)

      if (trails.length > 0) {
        wl.hydrateTrailsFromApi(trails, routesFromTrails(trails, geometryById))
        catalogSource.set('api')
      }
    }
    catch (err) {
      catalogError.set(err instanceof Error ? err.message : 'Could not load trails')
      catalogSource.set('seed')
    }
    finally {
      catalogLoading.set(false)
      catalogLoaded.set(true)
    }
  })
}

/**
 * Search the catalog server-side.
 *
 * Every filter goes to the API rather than being applied to whatever happens
 * to be in the store, which is what makes searching 40,000 trails possible
 * from a page that only ever holds a couple of hundred.
 */
export async function queryTrails(query: TrailQuery): Promise<TrailQueryResult> {
  const params = new URLSearchParams()

  if (query.q)
    params.set('q', query.q)
  if (query.state)
    params.set('state', query.state)
  if (query.difficulty && query.difficulty !== 'all')
    params.set('difficulty', query.difficulty)
  if (query.routeType && query.routeType !== 'all')
    params.set('routeType', query.routeType)
  if (query.sort)
    params.set('sort', query.sort)

  params.set('limit', String(query.limit ?? 60))
  params.set('offset', String(query.offset ?? 0))

  const res = await fetch(`/api/trails?${params}`)
  if (!res.ok)
    throw new Error(`Trails API returned ${res.status}`)

  const payload = await res.json()
  const { trails, geometryById } = normalizeTrailsPayload(payload)

  return {
    trails,
    geometryById,
    total: Number(payload?.meta?.total) || trails.length,
    hasMore: Boolean(payload?.meta?.hasMore),
  }
}
