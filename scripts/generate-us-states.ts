/**
 * Regenerate `resources/functions/scraper/data/us-states.json`.
 *
 * The trail ingest has to answer "which state is this trail in?" for every one
 * of the millions of features it pulls, offline and without a per-point API
 * call. That needs actual state polygons, not bounding boxes: a bbox for Idaho
 * and one for Montana overlap across most of their shared border, so a bbox
 * lookup mislabels a large share of the Rockies.
 *
 * Source: US Census Bureau TIGERweb (public domain), simplified server-side via
 * `maxAllowableOffset` so the committed file stays small. The offset is coarse
 * on purpose — it is chosen to be accurate to roughly a mile at the border,
 * which is far tighter than the labelling needs, while keeping the payload
 * around 100 KB.
 *
 * Run: `bun scripts/generate-us-states.ts`
 */

const ENDPOINT = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/0/query'

/** Degrees of simplification applied by the server. ~2 km at these latitudes. */
const MAX_ALLOWABLE_OFFSET = 0.02

/** Coordinate precision kept in the file. 4dp ≈ 11 m, well past what we need. */
const PRECISION = 4

interface EsriPolygonFeature {
  attributes: { GEOID: string, NAME: string, STUSAB: string }
  geometry?: { rings: number[][][] }
}

export interface StatePolygon {
  /** Two-letter USPS code, e.g. `CO`. */
  code: string
  /** Full name, e.g. `Colorado`. */
  name: string
  /** `[minLng, minLat, maxLng, maxLat]` — the cheap prefilter before ray casting. */
  bbox: [number, number, number, number]
  /** Outer rings as `[lng, lat]` pairs. Holes are dropped; states have none that matter. */
  rings: number[][][]
}

function round(n: number): number {
  const f = 10 ** PRECISION
  return Math.round(n * f) / f
}

async function main(): Promise<void> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'GEOID,NAME,STUSAB',
    returnGeometry: 'true',
    outSR: '4326',
    maxAllowableOffset: String(MAX_ALLOWABLE_OFFSET),
    f: 'json',
  })

  const response = await fetch(`${ENDPOINT}?${params}`)
  if (!response.ok)
    throw new Error(`TIGERweb returned ${response.status} ${response.statusText}`)

  const body = await response.json() as { features?: EsriPolygonFeature[] }
  const features = body.features ?? []
  if (features.length === 0)
    throw new Error('TIGERweb returned no state features')

  const states: StatePolygon[] = []

  for (const feature of features) {
    const rings = feature.geometry?.rings
    if (!rings || rings.length === 0)
      continue

    let minLng = Number.POSITIVE_INFINITY
    let minLat = Number.POSITIVE_INFINITY
    let maxLng = Number.NEGATIVE_INFINITY
    let maxLat = Number.NEGATIVE_INFINITY

    const rounded = rings.map(ring => ring.map(([lng, lat]) => {
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

    states.push({
      code: feature.attributes.STUSAB,
      name: feature.attributes.NAME,
      bbox: [round(minLng), round(minLat), round(maxLng), round(maxLat)],
      rings: rounded,
    })
  }

  states.sort((a, b) => a.code.localeCompare(b.code))

  const target = new URL('../resources/functions/scraper/data/us-states.json', import.meta.url)
  await Bun.write(target, `${JSON.stringify(states)}\n`)

  const bytes = (await Bun.file(target).arrayBuffer()).byteLength
  console.log(`Wrote ${states.length} states (${(bytes / 1024).toFixed(1)} KB) to ${target.pathname}`)
}

await main()
