import type { TrailSource, TrailSourceAdapter } from '../types'
import { npsSource } from './nps'
import { osmSource } from './osm'
import { usfsSource } from './usfs'

/**
 * Every source the ingest knows about.
 *
 * Ordered smallest-first on purpose. The federal layers are a few hundred
 * shards that finish in under an hour and immediately give the app a usable
 * national catalog; OSM is ~1,200 slow Overpass tiles that take days. Running
 * them in this order means the site has real data on day one rather than after
 * the long tail completes.
 */
export const sources: TrailSourceAdapter[] = [npsSource, usfsSource, osmSource]

export function getSource(name: string): TrailSourceAdapter {
  const source = sources.find(candidate => candidate.source === name)

  if (!source)
    throw new Error(`Unknown trail source: ${name}. Available: ${sources.map(s => s.source).join(', ')}`)

  return source
}

export function sourceNames(): TrailSource[] {
  return sources.map(source => source.source)
}

export { npsSource, osmSource, usfsSource }
