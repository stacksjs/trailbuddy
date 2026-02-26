/**
 * Region definitions and tile generation for trail scraping
 * Regions are divided into tiles to avoid Overpass API timeouts
 */

export interface BoundingBox {
  south: number
  west: number
  north: number
  east: number
}

export interface Tile extends BoundingBox {
  index: number
  total: number
}

export interface RegionDefinition {
  name: string
  displayName: string
  bbox: BoundingBox
  tileSize: number
}

export const regions: Record<string, RegionDefinition> = {
  us: {
    name: 'us',
    displayName: 'United States',
    bbox: { south: 24.5, west: -125.0, north: 49.5, east: -66.5 },
    tileSize: 1.0,
  },
  germany: {
    name: 'germany',
    displayName: 'Germany',
    bbox: { south: 47.27, west: 5.87, north: 55.06, east: 15.04 },
    tileSize: 0.5,
  },
  europe: {
    name: 'europe',
    displayName: 'Europe',
    bbox: { south: 35.0, west: -10.0, north: 71.0, east: 40.0 },
    tileSize: 1.0,
  },
}

/**
 * Generate tiles for a region by subdividing its bounding box
 */
export function generateTiles(regionName: string): Tile[] {
  const region = regions[regionName]
  if (!region)
    throw new Error(`Unknown region: ${regionName}. Available: ${Object.keys(regions).join(', ')}`)

  const { bbox, tileSize } = region
  const tiles: Tile[] = []

  const latSteps = Math.ceil((bbox.north - bbox.south) / tileSize)
  const lngSteps = Math.ceil((bbox.east - bbox.west) / tileSize)
  const total = latSteps * lngSteps

  let index = 0
  for (let latIdx = 0; latIdx < latSteps; latIdx++) {
    for (let lngIdx = 0; lngIdx < lngSteps; lngIdx++) {
      tiles.push({
        south: bbox.south + latIdx * tileSize,
        west: bbox.west + lngIdx * tileSize,
        north: Math.min(bbox.south + (latIdx + 1) * tileSize, bbox.north),
        east: Math.min(bbox.west + (lngIdx + 1) * tileSize, bbox.east),
        index,
        total,
      })
      index++
    }
  }

  return tiles
}

/**
 * Get region definition by name
 */
export function getRegion(name: string): RegionDefinition {
  const region = regions[name]
  if (!region)
    throw new Error(`Unknown region: ${name}. Available: ${Object.keys(regions).join(', ')}`)
  return region
}
