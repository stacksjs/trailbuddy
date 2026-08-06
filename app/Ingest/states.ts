/**
 * Resolve a coordinate to a US state, offline.
 *
 * Every ingested trail needs a state so the catalog can be browsed by one, and
 * with millions of features a per-point geocoding call is not an option. The
 * lookup is a bbox prefilter followed by ray casting against simplified state
 * polygons (see `scripts/generate-us-states.ts` for how the data is produced).
 */

import statesData from './data/us-states.json' with { type: 'json' }

export interface StatePolygon {
  code: string
  name: string
  bbox: [number, number, number, number]
  rings: number[][][]
}

export interface StateMatch {
  code: string
  name: string
}

const states = statesData as unknown as StatePolygon[]

/**
 * Territories and freely-associated areas the Census returns alongside the
 * states. They are legitimately part of the dataset, but "trails in the US"
 * for this app means the 50 states plus DC, and their trails would otherwise
 * skew every "nearby" query run from the mainland.
 */
const NON_STATE_CODES = new Set(['AS', 'GU', 'MP', 'PR', 'VI'])

/**
 * Standard even-odd ray casting. Points exactly on an edge are unstable here,
 * which is fine: a trail lying precisely on a state line is arbitrary anyway,
 * and the caller falls back to the nearest state by centroid.
 */
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]

    const intersects = (yi > lat) !== (yj > lat)
      && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi

    if (intersects)
      inside = !inside
  }

  return inside
}

function inBbox(lng: number, lat: number, bbox: [number, number, number, number]): boolean {
  return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]
}

/**
 * The state containing `lat`/`lng`, or `null` when the point is outside the US
 * (or inside a territory we deliberately exclude).
 *
 * Multi-ring states are handled by testing every ring: Michigan's two
 * peninsulas, Hawaii's islands and Alaska's archipelago are all separate rings
 * of one state, so any hit counts.
 */
export function resolveState(lat: number, lng: number): StateMatch | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return null

  for (const state of states) {
    if (NON_STATE_CODES.has(state.code))
      continue
    if (!inBbox(lng, lat, state.bbox))
      continue

    for (const ring of state.rings) {
      if (pointInRing(lng, lat, ring))
        return { code: state.code, name: state.name }
    }
  }

  return null
}

/** Every state the ingest covers, in code order. */
export function allStates(): StateMatch[] {
  return states
    .filter(state => !NON_STATE_CODES.has(state.code))
    .map(state => ({ code: state.code, name: state.name }))
}

/** The bounding box of a state, for tiling an ingest run state by state. */
export function stateBbox(code: string): [number, number, number, number] | null {
  return states.find(state => state.code === code)?.bbox ?? null
}
