const DIFFICULTIES = new Set(['easy', 'moderate', 'hard'])
const ROUTE_TYPES = new Set(['loop', 'out-and-back', 'point-to-point', 'network'])
const SOURCES = new Set(['osm', 'usfs', 'nps', 'manual'])
const SORTS = new Set(['featured', 'distance', 'longest', 'rating', 'name'])

/** Degrees of latitude per mile. Longitude is narrowed by cos(lat) at use. */
const DEGREES_PER_MILE = 1 / 69

/**
 * List trails for the explore map and catalog.
 *
 * Every filter, the ordering and the page window are pushed into SQL. That is
 * not premature optimization: the catalog is fed by a national ingest and the
 * table holds tens of thousands of rows today on its way to millions. The
 * previous implementation called `Trail.all()` and sliced the result in
 * JavaScript, which meant every request to this endpoint deserialized the
 * entire table — geometry strings included — to return 500 rows. Two indexes
 * added with those columns (`trails_state_index`, `trails_bbox_index`) exist
 * precisely so this query does not have to scan.
 */
export default new Action({
  name: 'Trail Index',
  description: 'List trails for the explore map and catalog',
  method: 'GET',

  async handle(request) {
    const page = readPageParams(request, { defaultLimit: 200, maxLimit: 500 })

    try {
      // Built twice: once to count the matches, once to fetch the window.
      // A count over an indexed predicate is cheap, and it is the only way to
      // give the UI an honest "N trails match" without fetching all of them.
      const rows = await applyFilters(Trail.query(), request)
        .orderBy(...sortColumns(request))
        .limit(page.limit)
        .offset(page.offset)
        .get()

      const total = await applyFilters(Trail.query(), request).count()

      const trails = (rows ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        // The map layer reads `lat`/`lng`; the column names are the long form.
        lat: row.latitude,
        lng: row.longitude,
      }))

      return response.json({
        success: true,
        trails,
        meta: {
          offset: page.offset,
          limit: page.limit,
          total,
          hasMore: page.offset + trails.length < total,
        },
      })
    }
    catch (error) {
      console.error('[trails] index failed:', error)
      return response.json({
        success: false,
        trails: [],
        meta: { offset: 0, limit: 0, total: 0, hasMore: false },
        error: 'Failed to fetch trails',
      }, 500)
    }
  },
})

/**
 * Apply every query-string filter to a builder.
 *
 * Shared by the page query and the count query so the two can never disagree
 * about what "matching" means.
 */
function applyFilters(query: any, request: { get: (key: string) => any }): any {
  const search = readString(request, 'q') ?? readString(request, 'search')
  if (search) {
    // Name first, then place. `location` carries the park or forest, so
    // "yosemite" and "pisgah" find their trails even when no trail is named
    // after them.
    const pattern = `%${search}%`
    query = query.whereGroup((group: any) => group
      .whereLike('name', pattern)
      .orWhereLike('location', pattern)
      .orWhereLike('state_name', pattern))
  }

  const country = readString(request, 'country')
  if (country && /^[a-z]{2}$/i.test(country))
    query = query.where('country', country.toUpperCase())

  // Two letters for a US state (`CO`), ISO 3166-2 elsewhere (`DE-BY`). The
  // old two-letter-only pattern silently ignored every DACH region, so
  // `?state=DE-BY` quietly returned the whole catalog instead of Bayern.
  const state = readString(request, 'state')
  if (state && /^[a-z]{2}(?:-[a-z0-9]{1,3})?$/i.test(state))
    query = query.where('state', state.toUpperCase())

  const difficulty = readString(request, 'difficulty')
  if (difficulty && DIFFICULTIES.has(difficulty))
    query = query.where('difficulty', difficulty)

  const routeType = readString(request, 'routeType') ?? readString(request, 'route_type')
  if (routeType && ROUTE_TYPES.has(routeType))
    query = query.where('route_type', routeType)

  const source = readString(request, 'source')
  if (source && SOURCES.has(source))
    query = query.where('source', source)

  const minDistance = readNumber(request, 'minDistance')
  if (minDistance !== null)
    query = query.where('distance', '>=', minDistance)

  const maxDistance = readNumber(request, 'maxDistance')
  if (maxDistance !== null)
    query = query.where('distance', '<=', maxDistance)

  if (readString(request, 'dogsAllowed') === 'true')
    query = query.where('dogs_allowed', true)

  if (readString(request, 'accessible') === 'true')
    query = query.where('wheelchair_accessible', true)

  if (readString(request, 'nationalTrail') === 'true')
    query = query.where('national_trail', true)

  // "Near me": a bounding box, not a radius. It is an index range scan rather
  // than a full-table haversine, and at the zoom a map actually renders the
  // difference between a box and a circle is not visible.
  const lat = readNumber(request, 'lat')
  const lng = readNumber(request, 'lng')
  const radius = readNumber(request, 'radius') ?? 25

  if (lat !== null && lng !== null) {
    const latSpan = radius * DEGREES_PER_MILE
    // A degree of longitude shrinks toward the poles; without the cosine the
    // box would be far too wide in Alaska and slightly too narrow in Florida.
    const lngSpan = latSpan / Math.max(0.15, Math.cos((lat * Math.PI) / 180))

    query = query
      .where('latitude', '>=', lat - latSpan)
      .where('latitude', '<=', lat + latSpan)
      .where('longitude', '>=', lng - lngSpan)
      .where('longitude', '<=', lng + lngSpan)
  }

  return query
}

/**
 * Default ordering is "featured": National Scenic and Recreation Trails first,
 * then the longest routes. With a catalog this size an unordered page is a
 * random sample of forest service connector spurs, which is a poor first
 * impression of a national trail database.
 */
function sortColumns(request: { get: (key: string) => any }): [string, 'asc' | 'desc'] {
  const sort = readString(request, 'sort')

  switch (sort && SORTS.has(sort) ? sort : 'featured') {
    case 'distance':
      return ['distance', 'asc']
    case 'longest':
      return ['distance', 'desc']
    case 'rating':
      return ['rating', 'desc']
    case 'name':
      return ['name', 'asc']
    default:
      return ['national_trail', 'desc']
  }
}

function readString(request: { get: (key: string) => any }, key: string): string | null {
  const raw = request.get(key)
  if (typeof raw !== 'string')
    return null

  const value = raw.trim()
  return value.length > 0 ? value : null
}

function readNumber(request: { get: (key: string) => any }, key: string): number | null {
  const raw = Number(request.get(key))
  return Number.isFinite(raw) ? raw : null
}
