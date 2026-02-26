/**
 * Deduplication logic for trail imports
 * Uses proximity + name matching to avoid duplicate trail entries
 */

import type { Coordinate } from '../geo'
import type { NormalizedTrail } from './trail-normalizer'
import { haversineDistance } from '../geo'

interface ExistingTrail {
  name: string
  latitude: number
  longitude: number
}

/**
 * Normalize a trail name for fuzzy comparison
 * Strips common suffixes and converts to lowercase
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(trail|path|weg|wanderweg|pfad|steig|route|loop|out-and-back)\b/gi, '')
    .replace(/[^a-z0-9äöüß]/g, '')
    .trim()
}

/**
 * Check if a trail is a duplicate of any existing trail
 *
 * Rules:
 * - Exact match: centroids within 100m → skip
 * - Fuzzy match: centroids within 500m AND normalized names match → skip
 */
function isDuplicate(trail: NormalizedTrail, existingTrails: ExistingTrail[]): boolean {
  const trailCoord: Coordinate = { lat: trail.latitude, lng: trail.longitude }
  const trailNameNorm = normalizeName(trail.name)

  for (const existing of existingTrails) {
    const existingCoord: Coordinate = { lat: existing.latitude, lng: existing.longitude }
    const distance = haversineDistance(trailCoord, existingCoord)

    // Exact match: very close centroids
    if (distance < 100)
      return true

    // Fuzzy match: somewhat close + same normalized name
    if (distance < 500 && normalizeName(existing.name) === trailNameNorm)
      return true
  }

  return false
}

/**
 * Filter out duplicate trails from a batch
 * Returns only trails that don't match any existing trail
 */
export function deduplicateTrails(
  newTrails: NormalizedTrail[],
  existingTrails: ExistingTrail[],
): { unique: NormalizedTrail[], duplicateCount: number } {
  const unique: NormalizedTrail[] = []
  let duplicateCount = 0

  // Also deduplicate within the batch itself
  const accepted: ExistingTrail[] = [...existingTrails]

  for (const trail of newTrails) {
    if (isDuplicate(trail, accepted)) {
      duplicateCount++
    }
    else {
      unique.push(trail)
      accepted.push({
        name: trail.name,
        latitude: trail.latitude,
        longitude: trail.longitude,
      })
    }
  }

  return { unique, duplicateCount }
}
