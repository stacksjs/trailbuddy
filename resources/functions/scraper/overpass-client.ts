/**
 * Overpass API client with rate limiting, retries, and exponential backoff
 * Uses Bun's built-in fetch — no external dependencies
 */

import type { Tile } from './region-definitions'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'
const MIN_DELAY_MS = 5000
const MAX_RETRIES = 3
const BACKOFF_BASE_MS = 10000

export interface OverpassElement {
  type: 'way' | 'relation' | 'node'
  id: number
  tags?: Record<string, string>
  geometry?: Array<{ lat: number, lon: number }>
  bounds?: { minlat: number, minlon: number, maxlat: number, maxlon: number }
  members?: Array<{
    type: string
    ref: number
    role: string
    geometry?: Array<{ lat: number, lon: number }>
  }>
}

interface OverpassResponse {
  elements: OverpassElement[]
}

/**
 * Build Overpass QL query for hiking trails within a bounding box
 */
function buildQuery(tile: Tile): string {
  const bbox = `${tile.south},${tile.west},${tile.north},${tile.east}`
  return `[out:json][timeout:180][bbox:${bbox}];(way["highway"="path"]["name"];way["highway"="footway"]["name"];way["highway"="track"]["name"]["tracktype"~"grade[1-3]"];relation["route"="hiking"]["name"];relation["route"="foot"]["name"];);out body geom;`
}

let lastRequestTime = 0

/**
 * Enforce minimum delay between requests to respect Overpass rate limits
 */
async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestTime
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed))
  }
}

/**
 * Fetch trails from a single tile with retries and exponential backoff
 */
export async function fetchTile(tile: Tile, verbose = false): Promise<OverpassElement[]> {
  const query = buildQuery(tile)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await rateLimit()

    try {
      if (verbose)
        console.log(`  [tile ${tile.index + 1}/${tile.total}] Querying Overpass (attempt ${attempt + 1})...`)

      lastRequestTime = Date.now()

      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })

      if (response.status === 429 || response.status === 504) {
        const backoff = BACKOFF_BASE_MS * 2 ** attempt
        if (verbose)
          console.log(`  Rate limited (${response.status}), backing off ${backoff / 1000}s...`)
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, backoff))
          continue
        }
        console.warn(`  [tile ${tile.index + 1}/${tile.total}] Max retries exceeded, skipping tile`)
        return []
      }

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as OverpassResponse
      return data.elements
    }
    catch (error) {
      if (attempt < MAX_RETRIES) {
        const backoff = BACKOFF_BASE_MS * 2 ** attempt
        if (verbose)
          console.log(`  Error: ${error instanceof Error ? error.message : error}, retrying in ${backoff / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, backoff))
        continue
      }
      console.warn(`  [tile ${tile.index + 1}/${tile.total}] Failed after ${MAX_RETRIES + 1} attempts: ${error instanceof Error ? error.message : error}`)
      return []
    }
  }

  return []
}
