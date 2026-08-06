/**
 * Shared plumbing for the two federal ArcGIS trail layers.
 *
 * Both the Forest Service and the Park Service publish through Esri REST, and
 * both have the same two traits that shape how they are read:
 *
 *  1. A response is capped (2,000 features), and the cap is signalled by
 *     `exceededTransferLimit` rather than an error — so every query has to be
 *     paged until that flag clears or a page comes back short.
 *  2. A named trail is stored as many short segment rows, not one feature. Ten
 *     miles of the Colorado Trail is dozens of rows. Inserting them raw would
 *     fill the catalog with quarter-mile fragments that all share a name.
 *
 * `fetchAllPages` handles the first; the callers group segments by a source
 * specific identity and hand the joined coordinates to one normalizer, which
 * handles the second.
 */

import type { Coordinate } from '../../../resources/functions/geo'
import type { TrailHttpClient } from '../client'
import { haversineDistance } from '../../../resources/functions/geo'

export interface EsriFeature<T> {
  attributes: T
  geometry?: { paths?: number[][][] }
}

interface EsriQueryResponse<T> {
  features?: Array<EsriFeature<T>>
  exceededTransferLimit?: boolean
  error?: { code: number, message: string, details?: string[] }
}

export interface EsriQuery {
  endpoint: string
  where: string
  outFields: string[]
  returnGeometry?: boolean
  /** Esri caps this server-side; asking for more than the cap is harmless. */
  pageSize?: number
  /** Required for stable paging: without it, page 2 may repeat page 1's rows. */
  orderByFields?: string
  /**
   * Ask the server to collapse duplicates. Enumerating the 350 park units this
   * way is one small request instead of paging all 31,000 trail rows to read
   * one column off them.
   */
  returnDistinctValues?: boolean
}

/**
 * Read every page of an Esri query.
 *
 * Paging is by `resultOffset`, which is only well-defined against a stable
 * sort — hence the mandatory `orderByFields`. The loop stops on the first page
 * that is not full and does not set `exceededTransferLimit`, and refuses to
 * spin forever on a server that keeps claiming there is more.
 */
export async function fetchAllPages<T>(
  client: TrailHttpClient,
  query: EsriQuery,
): Promise<Array<EsriFeature<T>>> {
  const pageSize = query.pageSize ?? 2000
  const collected: Array<EsriFeature<T>> = []

  // 100 pages × 2,000 = 200,000 features, an order of magnitude more than the
  // largest forest or park holds. Hitting it means the server is misreporting.
  const MAX_PAGES = 100

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      where: query.where,
      outFields: query.outFields.join(','),
      returnGeometry: String(query.returnGeometry ?? true),
      outSR: '4326',
      orderByFields: query.orderByFields ?? 'objectid',
      resultOffset: String(page * pageSize),
      resultRecordCount: String(pageSize),
      f: 'json',
    })

    if (query.returnDistinctValues)
      params.set('returnDistinctValues', 'true')

    const url = `${query.endpoint}/query?${params}`
    const response = await client.json<EsriQueryResponse<T>>(url)

    // Esri reports query errors with HTTP 200 and an `error` body, so this is
    // the only place a bad `where` clause surfaces.
    if (response.error)
      throw new Error(`ArcGIS ${response.error.code}: ${response.error.message}`)

    const features = response.features ?? []
    collected.push(...features)

    if (!response.exceededTransferLimit && features.length < pageSize)
      return collected
  }

  return collected
}

/**
 * Flatten an Esri polyline into a single coordinate run.
 *
 * A feature may hold several disjoint paths. They are concatenated in the
 * order given: for one trail's segments that is the trail, and for the rare
 * genuinely-disjoint feature the extra straight hop only affects the drawn
 * line, never the bounds or the state assignment.
 */
export function pathsToCoordinates(paths: number[][][] | undefined): Coordinate[] {
  if (!paths)
    return []

  const coords: Coordinate[] = []
  for (const path of paths) {
    for (const [lng, lat] of path)
      coords.push({ lat, lng })
  }

  return coords
}

/**
 * The largest gap two segments may have between them and still be considered
 * the same trail, in metres.
 *
 * Segments in these layers abut within a few metres; a kilometre is generous
 * enough to absorb a survey gap or a road crossing, and far too small to bridge
 * two unrelated trails that happen to share an identifier.
 */
const MAX_JOIN_GAP_METERS = 1000

/**
 * Join segment runs into continuous routes, returning one array per
 * *connected* route.
 *
 * Segments arrive in arbitrary order and arbitrary direction — the Forest
 * Service stores each as it was surveyed — so they have to be chained by
 * proximity: repeatedly attach whichever remaining segment starts or ends
 * nearest the current tail, flipping it when needed.
 *
 * The important part is that it refuses to chain across a real gap. Grouping
 * upstream is imperfect (Forest Service trail numbers are unique per ranger
 * district, not per forest, so number 7 in the Idaho Panhandle is three
 * different trails in three districts), and without this guard the joiner
 * happily drew a straight line between them and reported "Heart Lake" as a
 * 260-mile trail spanning two degrees of latitude. Disconnected clusters come
 * back as separate routes, and the caller publishes them as separate trails.
 *
 * O(n²) in segments per trail, which is fine: trails have tens of segments.
 */
export function joinSegments(segments: Coordinate[][]): Coordinate[][] {
  const remaining = segments.filter(segment => segment.length >= 2)
  if (remaining.length === 0)
    return []

  const routes: Coordinate[][] = []

  while (remaining.length > 0) {
    const route = remaining.shift()!

    // Grow this route until nothing left is close enough to belong to it.
    // Both ends are eligible: the seed segment is rarely an endpoint of the
    // trail, so growing forward only would strand everything behind it.
    let grew = true
    while (grew && remaining.length > 0) {
      grew = false

      for (const atTail of [true, false]) {
        const anchor = atTail ? route[route.length - 1] : route[0]

        let bestIndex = -1
        let bestDistance = Number.POSITIVE_INFINITY
        let bestFlipped = false

        for (let i = 0; i < remaining.length; i++) {
          const segment = remaining[i]
          const toHead = haversineDistance(anchor, segment[0])
          const toTail = haversineDistance(anchor, segment[segment.length - 1])

          if (toHead < bestDistance) {
            bestDistance = toHead
            bestIndex = i
            bestFlipped = false
          }

          if (toTail < bestDistance) {
            bestDistance = toTail
            bestIndex = i
            bestFlipped = true
          }
        }

        if (bestIndex === -1 || bestDistance > MAX_JOIN_GAP_METERS)
          continue

        const [next] = remaining.splice(bestIndex, 1)
        // Attaching at the tail consumes the segment head-first; attaching at
        // the head means it runs into the route, so the orientation inverts.
        const oriented = bestFlipped ? [...next].reverse() : next

        if (atTail)
          route.push(...oriented)
        else
          route.unshift(...[...oriented].reverse())

        grew = true
      }
    }

    routes.push(route)
  }

  // Deterministic order, so the ids derived from it are stable between runs
  // even though the upstream row order is not.
  return routes.sort((a, b) => a[0].lat - b[0].lat || a[0].lng - b[0].lng)
}
