/**
 * Transform OSM Overpass elements into Trail model fields
 */

import type { Coordinate } from '../geo'
import type { OverpassElement } from './overpass-client'
import { haversineDistance } from '../geo'

export interface NormalizedTrail {
  name: string
  location: string
  distance: number
  elevation: number
  difficulty: 'easy' | 'moderate' | 'hard'
  rating: number
  reviewCount: number
  estimatedTime: string
  image: string
  tags: string
  latitude: number
  longitude: number
  description: string
  /** JSON [[lat,lng],...] for map polylines */
  geometry: string
}

/**
 * Extract all geometry coordinates from an OSM element
 */
function extractGeometry(element: OverpassElement): Coordinate[] {
  // Ways have direct geometry
  if (element.geometry) {
    return element.geometry.map(g => ({ lat: g.lat, lng: g.lon }))
  }

  // Relations have members with geometry
  if (element.members) {
    const coords: Coordinate[] = []
    for (const member of element.members) {
      if (member.geometry) {
        for (const g of member.geometry) {
          coords.push({ lat: g.lat, lng: g.lon })
        }
      }
    }
    return coords
  }

  return []
}

/**
 * Calculate total distance along a path of coordinates in km
 */
function calculatePathDistance(coords: Coordinate[]): number {
  let totalMeters = 0
  for (let i = 0; i < coords.length - 1; i++) {
    totalMeters += haversineDistance(coords[i], coords[i + 1])
  }
  return Math.round((totalMeters / 1000) * 10) / 10 // km, 1 decimal
}

/**
 * Calculate centroid of coordinates
 */
function centroid(coords: Coordinate[]): Coordinate {
  const lat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length
  const lng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length
  return { lat, lng }
}

/**
 * Map OSM sac_scale tag to difficulty
 */
function mapDifficulty(tags: Record<string, string>): 'easy' | 'moderate' | 'hard' {
  const sacScale = tags.sac_scale || ''

  if (sacScale.includes('alpine_hiking') || sacScale.includes('demanding_alpine') || sacScale.includes('difficult_alpine'))
    return 'hard'
  if (sacScale.includes('demanding_mountain') || sacScale.includes('mountain_hiking'))
    return 'moderate'
  if (sacScale.includes('hiking') || sacScale === '')
    return 'easy'

  // Fallback based on highway type
  if (tags.highway === 'track')
    return 'moderate'

  return 'easy'
}

/**
 * Parse elevation from OSM tags
 */
function parseElevation(tags: Record<string, string>): number {
  const ascent = tags.ascent || tags.ele || tags['ele:start'] || ''
  const parsed = Number.parseInt(ascent.replace(/[^0-9.-]/g, ''), 10)
  return Number.isNaN(parsed) ? 0 : Math.abs(parsed)
}

/**
 * Compute estimated time using Naismith's Rule
 * @returns formatted string like "2h 30m"
 */
function computeEstimatedTime(distanceKm: number, elevationM: number): string {
  const hours = distanceKm / 5 + elevationM / 600
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60

  if (h === 0)
    return `${m}m`
  if (m === 0)
    return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Derive tags from OSM metadata
 */
function deriveTags(tags: Record<string, string>): string {
  const derived: string[] = ['source:osm']

  if (tags.surface) {
    const surfaceMap: Record<string, string> = {
      asphalt: 'paved',
      concrete: 'paved',
      gravel: 'gravel',
      ground: 'dirt',
      earth: 'dirt',
      dirt: 'dirt',
      grass: 'grass',
      sand: 'sand',
      wood: 'boardwalk',
    }
    const mapped = surfaceMap[tags.surface]
    if (mapped)
      derived.push(mapped)
  }

  if (tags.dog === 'yes' || tags.dog === 'leashed')
    derived.push('dog-friendly')
  if (tags.wheelchair === 'yes')
    derived.push('accessible')
  if (tags.lit === 'yes')
    derived.push('lit')
  if (tags.sac_scale)
    derived.push('hiking')
  if (tags.route === 'hiking' || tags.route === 'foot')
    derived.push('hiking')

  return [...new Set(derived)].join(',')
}

/**
 * Extract trail name from OSM tags
 */
function extractName(tags: Record<string, string>): string | null {
  if (tags.name)
    return tags.name
  if (tags['name:en'])
    return tags['name:en']
  if (tags.ref)
    return `${tags.ref} Trail`
  return null
}

/**
 * Normalize a single OSM element into Trail model fields
 * Returns null if the element doesn't have enough data
 */
export function normalizeElement(element: OverpassElement, regionDisplayName: string): NormalizedTrail | null {
  const tags = element.tags || {}
  const name = extractName(tags)
  if (!name)
    return null

  const coords = extractGeometry(element)
  if (coords.length < 2)
    return null

  const center = centroid(coords)
  const distanceKm = calculatePathDistance(coords)

  // Skip very short trails (< 0.1 km)
  if (distanceKm < 0.1)
    return null

  const elevation = parseElevation(tags)
  const difficulty = mapDifficulty(tags)

  const description = tags.description
    || `${name} is a ${distanceKm} km ${difficulty} trail located in ${regionDisplayName}.`

  const simplified = simplifyPath(coords, 120)

  return {
    name,
    location: regionDisplayName,
    distance: distanceKm,
    elevation,
    difficulty,
    rating: 0,
    reviewCount: 0,
    estimatedTime: computeEstimatedTime(distanceKm, elevation),
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop',
    tags: deriveTags(tags),
    latitude: Math.round(center.lat * 1000000) / 1000000,
    longitude: Math.round(center.lng * 1000000) / 1000000,
    description,
    geometry: JSON.stringify(simplified.map(c => [c.lat, c.lng])),
  }
}

/** Reduce point count for storage while keeping trail shape. */
function simplifyPath(coords: Coordinate[], maxPoints: number): Coordinate[] {
  if (coords.length <= maxPoints)
    return coords
  const step = Math.ceil(coords.length / maxPoints)
  const out: Coordinate[] = []
  for (let i = 0; i < coords.length; i += step)
    out.push(coords[i])
  const last = coords[coords.length - 1]
  const tail = out[out.length - 1]
  if (!tail || tail.lat !== last.lat || tail.lng !== last.lng)
    out.push(last)
  return out
}

/**
 * Get the centroid coordinates of a normalized trail (for dedup)
 */
export function getTrailCentroid(trail: NormalizedTrail): Coordinate {
  return { lat: trail.latitude, lng: trail.longitude }
}
