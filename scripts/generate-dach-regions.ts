/**
 * Regenerate `app/Ingest/data/dach-regions.json`.
 *
 * The same problem the US states file solves, for German, Austrian and Swiss
 * trails: the ingest has to answer "which region is this in?" for every feature
 * it pulls, offline, without a per-point geocoding call. Bounding boxes are not
 * enough — Alpine borders are jagged, and a bbox for Tirol overlaps most of
 * Bayern and half of Switzerland.
 *
 * Source: Natural Earth 10m admin-1 (public domain), filtered to DEU/AUT/CHE.
 * That is 16 German Länder, 9 Austrian Länder and 26 Swiss cantons.
 *
 * Unlike the Census endpoint, Natural Earth serves full-detail geometry with no
 * server-side simplification, so the reduction happens here — otherwise the
 * committed file would be tens of megabytes.
 *
 * Run: `bun scripts/generate-dach-regions.ts`
 */

const SOURCE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'

/** Natural Earth's 3-letter country code → the 2-letter code rows are tagged with. */
const COUNTRIES: Record<string, string> = {
  DEU: 'DE',
  AUT: 'AT',
  CHE: 'CH',
}

/**
 * Douglas-Peucker tolerance in degrees. ~1 km at these latitudes, matching the
 * ~2 km the US file uses — far coarser than the labelling needs, and chosen so
 * the whole DACH file stays in the same size class as the US one.
 */
const TOLERANCE = 0.01

/** Coordinate precision kept in the file. 4dp ≈ 11 m. */
const PRECISION = 4

/**
 * Rings smaller than this after simplification are dropped. Natural Earth
 * carries every islet in the Bodensee and every exclave a few hundred metres
 * across; they cost bytes and change no trail's label.
 */
const MIN_RING_POINTS = 4

interface GeoJsonFeature {
  properties: {
    name?: string
    name_de?: string
    iso_3166_2?: string
    adm0_a3?: string
  }
  geometry?: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface RegionPolygon {
  /** ISO 3166-2 subdivision code, e.g. `DE-BY`. Unique across all countries. */
  code: string
  /** Local-language name, e.g. `Bayern`. */
  name: string
  /** ISO 3166-1 alpha-2, e.g. `DE`. */
  country: string
  /** `[minLng, minLat, maxLng, maxLat]` — the cheap prefilter before ray casting. */
  bbox: [number, number, number, number]
  /** Outer rings as `[lng, lat]` pairs. */
  rings: number[][][]
  /**
   * Interior rings. Present only where a region encloses another one.
   *
   * This is not a detail that can be skipped here the way it can for US
   * states: Berlin sits entirely inside Brandenburg and Wien entirely inside
   * Niederösterreich, so dropping holes silently labelled every Berlin and
   * Vienna trail with the surrounding Land.
   */
  holes?: number[][][]
}

function round(n: number): number {
  const f = 10 ** PRECISION
  return Math.round(n * f) / f
}

/** Perpendicular distance from a point to the line through `start` and `end`. */
function perpendicularDistance(
  point: number[],
  start: number[],
  end: number[],
): number {
  const [px, py] = point
  const [sx, sy] = start
  const [ex, ey] = end

  const dx = ex - sx
  const dy = ey - sy

  if (dx === 0 && dy === 0)
    return Math.hypot(px - sx, py - sy)

  // Project the point onto the segment, clamped to its ends, then measure.
  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (sx + t * dx), py - (sy + t * dy))
}

/**
 * Iterative Douglas-Peucker.
 *
 * Iterative rather than recursive on purpose: some Natural Earth rings run to
 * tens of thousands of points, and the recursive form overflows the stack on
 * the Swiss cantons.
 */
function simplify(ring: number[][], tolerance: number): number[][] {
  if (ring.length <= 2)
    return ring

  const keep = new Uint8Array(ring.length)
  keep[0] = 1
  keep[ring.length - 1] = 1

  const stack: Array<[number, number]> = [[0, ring.length - 1]]

  while (stack.length > 0) {
    const [first, last] = stack.pop()!
    let maxDistance = 0
    let index = 0

    for (let i = first + 1; i < last; i++) {
      const distance = perpendicularDistance(ring[i], ring[first], ring[last])
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }

    if (maxDistance > tolerance) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }

  return ring.filter((_, i) => keep[i] === 1)
}

/**
 * Split a Polygon or MultiPolygon into outer rings and interior rings.
 *
 * GeoJSON puts the outer ring first in each polygon and any holes after it.
 * Holes from every polygon of a MultiPolygon are pooled: admin boundaries do
 * not overlap, so a hole can only ever exclude points from its own region.
 */
function splitRings(geometry: NonNullable<GeoJsonFeature['geometry']>): {
  outer: number[][][]
  holes: number[][][]
} {
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates as number[][][]]
    : (geometry.coordinates as number[][][][])

  const outer: number[][][] = []
  const holes: number[][][] = []

  for (const polygon of polygons) {
    if (!polygon || polygon.length === 0)
      continue

    outer.push(polygon[0])
    for (let i = 1; i < polygon.length; i++)
      holes.push(polygon[i])
  }

  return { outer, holes }
}

async function main(): Promise<void> {
  const response = await fetch(SOURCE)
  if (!response.ok)
    throw new Error(`Natural Earth returned ${response.status} ${response.statusText}`)

  const body = await response.json() as { features?: GeoJsonFeature[] }
  const features = body.features ?? []
  if (features.length === 0)
    throw new Error('Natural Earth returned no admin-1 features')

  const regions: RegionPolygon[] = []

  for (const feature of features) {
    const country = COUNTRIES[feature.properties.adm0_a3 ?? '']
    if (!country || !feature.geometry)
      continue

    const name = feature.properties.name_de || feature.properties.name
    const code = feature.properties.iso_3166_2
    if (!name || !code)
      continue

    let minLng = Number.POSITIVE_INFINITY
    let minLat = Number.POSITIVE_INFINITY
    let maxLng = Number.NEGATIVE_INFINITY
    let maxLat = Number.NEGATIVE_INFINITY

    const { outer, holes } = splitRings(feature.geometry)
    const rings: number[][][] = []

    for (const ring of outer) {
      const simplified = simplify(ring, TOLERANCE)
      if (simplified.length < MIN_RING_POINTS)
        continue

      rings.push(simplified.map(([lng, lat]) => {
        // The bbox is measured on the SIMPLIFIED ring. Measuring the original
        // would produce a box the polygon no longer fills, and the prefilter
        // would admit points the ray cast then rejects.
        if (lng < minLng)
          minLng = lng
        if (lng > maxLng)
          maxLng = lng
        if (lat < minLat)
          minLat = lat
        if (lat > maxLat)
          maxLat = lat
        return [round(lng), round(lat)]
      }))
    }

    if (rings.length === 0)
      continue

    // Holes are simplified INWARD-tolerant the same way, but not bbox-measured:
    // a hole never extends the region's extent.
    const simplifiedHoles = holes
      .map(ring => simplify(ring, TOLERANCE))
      .filter(ring => ring.length >= MIN_RING_POINTS)
      .map(ring => ring.map(([lng, lat]) => [round(lng), round(lat)]))

    regions.push({
      code,
      name,
      country,
      bbox: [round(minLng), round(minLat), round(maxLng), round(maxLat)],
      rings,
      ...(simplifiedHoles.length > 0 ? { holes: simplifiedHoles } : {}),
    })
  }

  regions.sort((a, b) => a.code.localeCompare(b.code))

  const target = new URL('../app/Ingest/data/dach-regions.json', import.meta.url)
  await Bun.write(target, `${JSON.stringify(regions)}\n`)

  const bytes = (await Bun.file(target).arrayBuffer()).byteLength
  const counts = Object.values(COUNTRIES)
    .map(code => `${code} ${regions.filter(r => r.country === code).length}`)
    .join(', ')

  console.log(`Wrote ${regions.length} regions (${counts}) — ${(bytes / 1024).toFixed(1)} KB`)
}

await main()
