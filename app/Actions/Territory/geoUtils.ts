/**
 * Geographic utility functions for territory management
 * Includes distance calculations, polygon operations, and GPS data processing
 */

export interface Coordinate {
  lat: number
  lng: number
}

export interface GeoJsonPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

/**
 * Convert degrees to radians
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in meters
 */
export function haversineDistance(point1: Coordinate, point2: Coordinate): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRad(point2.lat - point1.lat)
  const dLng = toRad(point2.lng - point1.lng)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if a GPS track forms a closed loop
 * @param coordinates Array of GPS coordinates
 * @param maxGapMeters Maximum distance between start/end to be considered a loop (default 50m)
 * @param minPoints Minimum points required for a valid loop (default 20)
 */
export function isClosedLoop(
  coordinates: Coordinate[],
  maxGapMeters: number = 50,
  minPoints: number = 20,
): boolean {
  if (coordinates.length < minPoints)
    return false

  const start = coordinates[0]
  const end = coordinates[coordinates.length - 1]
  const distance = haversineDistance(start, end)

  return distance <= maxGapMeters
}

/**
 * Calculate area of a polygon using Shoelace formula
 * @returns Area in square meters
 */
export function calculatePolygonArea(coordinates: Coordinate[]): number {
  if (coordinates.length < 3)
    return 0

  // Convert to projected coordinates for accurate area calculation
  const refLat = coordinates[0].lat
  const metersPerDegreeLat = 111132.92
  const metersPerDegreeLng = 111132.92 * Math.cos(toRad(refLat))

  const projected = coordinates.map(c => ({
    x: (c.lng - coordinates[0].lng) * metersPerDegreeLng,
    y: (c.lat - coordinates[0].lat) * metersPerDegreeLat,
  }))

  // Shoelace formula
  let area = 0
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length
    area += projected[i].x * projected[j].y
    area -= projected[j].x * projected[i].y
  }

  return Math.abs(area / 2)
}

/**
 * Calculate perimeter of a polygon
 * @returns Perimeter in meters
 */
export function calculatePerimeter(coordinates: Coordinate[]): number {
  let perimeter = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    perimeter += haversineDistance(coordinates[i], coordinates[i + 1])
  }
  // Close the loop if not already closed
  if (coordinates.length > 0) {
    const last = coordinates[coordinates.length - 1]
    const first = coordinates[0]
    if (last.lat !== first.lat || last.lng !== first.lng) {
      perimeter += haversineDistance(last, first)
    }
  }
  return perimeter
}

/**
 * Simplify a GPS track using Douglas-Peucker algorithm
 * @param tolerance Simplification tolerance in degrees (~0.00001 = 1 meter)
 */
export function simplifyTrack(
  coordinates: Coordinate[],
  tolerance: number = 0.00005,
): Coordinate[] {
  if (coordinates.length <= 2)
    return coordinates

  // Find point with max distance from line
  let maxDistance = 0
  let maxIndex = 0

  const start = coordinates[0]
  const end = coordinates[coordinates.length - 1]

  for (let i = 1; i < coordinates.length - 1; i++) {
    const distance = perpendicularDistance(coordinates[i], start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyTrack(coordinates.slice(0, maxIndex + 1), tolerance)
    const right = simplifyTrack(coordinates.slice(maxIndex), tolerance)
    return [...left.slice(0, -1), ...right]
  }

  return [start, end]
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function perpendicularDistance(
  point: Coordinate,
  lineStart: Coordinate,
  lineEnd: Coordinate,
): number {
  const dx = lineEnd.lng - lineStart.lng
  const dy = lineEnd.lat - lineStart.lat
  const norm = Math.sqrt(dx * dx + dy * dy)

  if (norm === 0)
    return Math.sqrt((point.lat - lineStart.lat) ** 2 + (point.lng - lineStart.lng) ** 2)

  return Math.abs(
    dy * point.lng - dx * point.lat + lineEnd.lng * lineStart.lat - lineEnd.lat * lineStart.lng,
  ) / norm
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  let inside = false
  const x = point.lng
  const y = point.lat

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Check if two line segments intersect
 */
function linesIntersect(
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  p4: Coordinate,
): boolean {
  const ccw = (A: Coordinate, B: Coordinate, C: Coordinate): boolean => {
    return (C.lat - A.lat) * (B.lng - A.lng) > (B.lat - A.lat) * (C.lng - A.lng)
  }

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
}

/**
 * Check if a line segment intersects a polygon
 * Used for conquest detection
 */
export function lineIntersectsPolygon(
  lineStart: Coordinate,
  lineEnd: Coordinate,
  polygon: Coordinate[],
): boolean {
  // Check if either endpoint is inside
  if (pointInPolygon(lineStart, polygon) || pointInPolygon(lineEnd, polygon)) {
    return true
  }

  // Check if line crosses any polygon edge
  for (let i = 0; i < polygon.length - 1; i++) {
    if (linesIntersect(lineStart, lineEnd, polygon[i], polygon[i + 1])) {
      return true
    }
  }

  return false
}

/**
 * Check if a route (array of coordinates) passes through a polygon
 */
export function routeIntersectsPolygon(route: Coordinate[], polygon: Coordinate[]): boolean {
  // Check if any point of the route is inside the polygon
  for (const point of route) {
    if (pointInPolygon(point, polygon)) {
      return true
    }
  }

  // Check if any segment of the route intersects the polygon
  for (let i = 0; i < route.length - 1; i++) {
    if (lineIntersectsPolygon(route[i], route[i + 1], polygon)) {
      return true
    }
  }

  return false
}

/**
 * Calculate bounding box for a polygon
 * @returns String format: "minLat,minLng,maxLat,maxLng"
 */
export function getBoundingBox(coordinates: Coordinate[]): string {
  const lats = coordinates.map(c => c.lat)
  const lngs = coordinates.map(c => c.lng)

  return `${Math.min(...lats)},${Math.min(...lngs)},${Math.max(...lats)},${Math.max(...lngs)}`
}

/**
 * Parse bounding box string back to object
 */
export function parseBoundingBox(bbox: string): { minLat: number, minLng: number, maxLat: number, maxLng: number } {
  const [minLat, minLng, maxLat, maxLng] = bbox.split(',').map(Number)
  return { minLat, minLng, maxLat, maxLng }
}

/**
 * Check if two bounding boxes overlap
 */
export function boundingBoxesOverlap(bbox1: string, bbox2: string): boolean {
  const b1 = parseBoundingBox(bbox1)
  const b2 = parseBoundingBox(bbox2)

  return !(b1.maxLat < b2.minLat || b1.minLat > b2.maxLat ||
           b1.maxLng < b2.minLng || b1.minLng > b2.maxLng)
}

/**
 * Calculate centroid of a polygon
 */
export function getCentroid(coordinates: Coordinate[]): Coordinate {
  const lat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length
  const lng = coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length
  return { lat, lng }
}

/**
 * Convert coordinate array to GeoJSON Polygon
 */
export function coordinatesToGeoJson(coordinates: Coordinate[]): string {
  // Ensure polygon is closed
  const coords = [...coordinates]
  if (coords.length > 0) {
    const first = coords[0]
    const last = coords[coords.length - 1]
    if (first.lat !== last.lat || first.lng !== last.lng) {
      coords.push(first)
    }
  }

  return JSON.stringify({
    type: 'Polygon',
    coordinates: [coords.map(c => [c.lng, c.lat])],
  })
}

/**
 * Convert GeoJSON Polygon to coordinate array
 */
export function geoJsonToCoordinates(geoJson: string): Coordinate[] {
  const parsed = JSON.parse(geoJson) as GeoJsonPolygon
  return parsed.coordinates[0].map((c: number[]) => ({
    lng: c[0],
    lat: c[1],
  }))
}

/**
 * Find intersection points between a line and a polygon
 * Returns array of intersection points
 */
export function findLinePolygonIntersections(
  lineStart: Coordinate,
  lineEnd: Coordinate,
  polygon: Coordinate[],
): Coordinate[] {
  const intersections: Coordinate[] = []

  for (let i = 0; i < polygon.length - 1; i++) {
    const intersection = lineIntersection(
      lineStart,
      lineEnd,
      polygon[i],
      polygon[i + 1],
    )
    if (intersection) {
      intersections.push(intersection)
    }
  }

  return intersections
}

/**
 * Calculate intersection point of two line segments
 * Returns null if lines don't intersect
 */
function lineIntersection(
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  p4: Coordinate,
): Coordinate | null {
  const x1 = p1.lng, y1 = p1.lat
  const x2 = p2.lng, y2 = p2.lat
  const x3 = p3.lng, y3 = p3.lat
  const x4 = p4.lng, y4 = p4.lat

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-10)
    return null

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      lng: x1 + t * (x2 - x1),
      lat: y1 + t * (y2 - y1),
    }
  }

  return null
}

/**
 * Split a polygon by a route passing through it
 * This is a simplified version - for MVP, we just identify
 * which portion of the territory the route carved through
 *
 * @returns Array of resulting polygons after the split
 */
export function splitPolygonByRoute(
  polygon: Coordinate[],
  route: Coordinate[],
): Coordinate[][] {
  // Find entry and exit points where the route crosses the polygon boundary
  const crossings: Array<{ point: Coordinate, index: number, routeIndex: number }> = []

  for (let i = 0; i < route.length - 1; i++) {
    for (let j = 0; j < polygon.length - 1; j++) {
      const intersection = lineIntersection(route[i], route[i + 1], polygon[j], polygon[j + 1])
      if (intersection) {
        crossings.push({ point: intersection, index: j, routeIndex: i })
      }
    }
  }

  // If less than 2 crossings, can't split properly
  if (crossings.length < 2) {
    return [polygon]
  }

  // Sort crossings by their position on the polygon boundary
  crossings.sort((a, b) => a.index - b.index)

  // Get entry and exit points
  const entry = crossings[0]
  const exit = crossings[crossings.length - 1]

  // Build two polygons:
  // 1. Portion with the route (conquered)
  // 2. Remaining portion (kept by original owner)

  const conquered: Coordinate[] = []
  const remaining: Coordinate[] = []

  // Add entry point to both
  conquered.push(entry.point)
  remaining.push(entry.point)

  // Add route points between entry and exit to conquered polygon
  const routeStart = entry.routeIndex + 1
  const routeEnd = exit.routeIndex + 1
  for (let i = routeStart; i < routeEnd; i++) {
    if (pointInPolygon(route[i], polygon)) {
      conquered.push(route[i])
    }
  }
  conquered.push(exit.point)

  // Add polygon points from exit to entry to conquered (short path)
  for (let i = exit.index + 1; i <= polygon.length - 1 && i <= entry.index + polygon.length; i++) {
    const idx = i % (polygon.length - 1)
    if (idx <= entry.index) {
      conquered.push(polygon[idx])
    }
  }

  // Add polygon points from entry to exit to remaining (long path)
  for (let i = entry.index + 1; i <= exit.index; i++) {
    remaining.push(polygon[i])
  }
  remaining.push(exit.point)

  // Close the polygons
  if (conquered.length > 0 && (conquered[0].lat !== conquered[conquered.length - 1].lat ||
      conquered[0].lng !== conquered[conquered.length - 1].lng)) {
    conquered.push(conquered[0])
  }
  if (remaining.length > 0 && (remaining[0].lat !== remaining[remaining.length - 1].lat ||
      remaining[0].lng !== remaining[remaining.length - 1].lng)) {
    remaining.push(remaining[0])
  }

  // Only return polygons with sufficient area (> 100 sq meters)
  const result: Coordinate[][] = []
  if (calculatePolygonArea(conquered) >= 100) {
    result.push(conquered)
  }
  if (calculatePolygonArea(remaining) >= 100) {
    result.push(remaining)
  }

  // If split failed, return original
  if (result.length === 0) {
    return [polygon]
  }

  return result
}

/**
 * Generate a loop of coordinates around a center point
 * Useful for seeding and testing
 */
export function generateLoopCoordinates(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  points: number = 20,
): Coordinate[] {
  const coords: Coordinate[] = []

  // Convert radius to degrees (approximate)
  const latRadius = radiusMeters / 111000
  const lngRadius = radiusMeters / (111000 * Math.cos(toRad(centerLat)))

  // Generate points with some randomness for realism
  for (let i = 0; i < points; i++) {
    const angle = (2 * Math.PI * i) / points
    const radiusVariation = 0.8 + Math.random() * 0.4 // 80-120% of radius

    coords.push({
      lat: centerLat + latRadius * radiusVariation * Math.sin(angle),
      lng: centerLng + lngRadius * radiusVariation * Math.cos(angle),
    })
  }

  // Close the loop
  coords.push(coords[0])

  return coords
}
