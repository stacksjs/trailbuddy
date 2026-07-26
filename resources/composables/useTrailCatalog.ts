import { onMount, state } from 'stx'
import {
  normalizeTrailsPayload,
  routesFromTrails,
} from '../assets/scripts/trail-data'

interface TrailStoreLike {
  trails: () => unknown[]
  hydrateTrailsFromApi: (trails: unknown[], routes: Record<number, [number, number][]>) => void
}

export const catalogLoading = state(false)
export const catalogLoaded = state(false)
export const catalogError = state<string | null>(null)
export const catalogSource = state<'api' | 'seed'>('seed')

let catalogStarted = false

/** Fetch trails once per app session (called from default layout). */
export function useTrailCatalog(wl: TrailStoreLike | null) {
  onMount(async () => {
    if (!wl || catalogStarted)
      return
    catalogStarted = true
    catalogLoading.set(true)
    catalogError.set(null)
    try {
      const res = await fetch('/api/trails?limit=500')
      if (!res.ok)
        throw new Error(`Trails API returned ${res.status}`)
      const payload = await res.json()
      const { trails, geometryById } = normalizeTrailsPayload(payload)
      if (trails.length > 0) {
        const routes = routesFromTrails(trails, geometryById)
        wl.hydrateTrailsFromApi(trails, routes)
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
