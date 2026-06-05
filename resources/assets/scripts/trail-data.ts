/**
 * Trail API ↔ UI normalization (Stacks ORM uses camelCase in JSON).
 */

export type LatLng = [number, number]

export interface UiTrail {
  id: number
  name: string
  location: string
  difficulty: 'easy' | 'moderate' | 'hard'
  distance: number
  elevation: number
  estimatedTime: string
  rating: number
  reviewCount: number
  description: string
  lat: number
  lng: number
  image: string | null
  tags: string[]
  conditions: string
}

const KM_TO_MI = 0.621371
const M_TO_FT = 3.28084

export function kmToMi(km: number): number {
  return Math.round(km * KM_TO_MI * 10) / 10
}

export function metersToFt(m: number): number {
  return Math.round(m * M_TO_FT)
}

/** Parse stored geometry JSON: [[lat,lng],...] */
export function parseTrailGeometry(raw: unknown): LatLng[] {
  if (!raw)
    return []
  if (Array.isArray(raw)) {
    return raw
      .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2
        && typeof p[0] === 'number' && typeof p[1] === 'number')
      .map(p => [p[0], p[1]])
  }
  if (typeof raw === 'string') {
    try {
      return parseTrailGeometry(JSON.parse(raw))
    }
    catch {
      return []
    }
  }
  return []
}

export function routesFromTrails(trails: UiTrail[], geometryById: Record<number, LatLng[]>): Record<number, LatLng[]> {
  const routes: Record<number, LatLng[]> = {}
  for (const t of trails) {
    const geom = geometryById[t.id]
    if (geom && geom.length >= 2)
      routes[t.id] = geom
    else if (t.lat && t.lng)
      routes[t.id] = [[t.lat, t.lng], [t.lat + 0.008, t.lng + 0.012]]
  }
  return routes
}

export function normalizeTrailRow(row: Record<string, unknown>): UiTrail | null {
  const id = Number(row.id)
  if (!Number.isFinite(id))
    return null

  const lat = Number(row.latitude ?? row.lat)
  const lng = Number(row.longitude ?? row.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return null

  const distanceKm = Number(row.distance) || 0
  const elevationM = Number(row.elevation) || 0
  const tagsRaw = row.tags
  const tags = typeof tagsRaw === 'string'
    ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    : Array.isArray(tagsRaw) ? tagsRaw.map(String) : []

  const difficulty = row.difficulty
  const diff = difficulty === 'easy' || difficulty === 'moderate' || difficulty === 'hard'
    ? difficulty
    : 'moderate'

  return {
    id,
    name: String(row.name ?? 'Unnamed trail'),
    location: String(row.location ?? ''),
    difficulty: diff,
    distance: kmToMi(distanceKm),
    elevation: metersToFt(elevationM),
    estimatedTime: String(row.estimatedTime ?? row.estimated_time ?? ''),
    rating: Number(row.rating) || 0,
    reviewCount: Number(row.reviewCount ?? row.review_count) || 0,
    description: String(row.description ?? ''),
    lat,
    lng,
    image: row.image ? String(row.image) : null,
    tags,
    conditions: String(row.conditions ?? 'Conditions reported by the community.'),
  }
}

export function extractApiTrailRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload))
    return payload as Record<string, unknown>[]
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (Array.isArray(obj.data))
      return obj.data as Record<string, unknown>[]
    if (Array.isArray(obj.trails))
      return obj.trails as Record<string, unknown>[]
  }
  return []
}

export function normalizeTrailsPayload(payload: unknown): {
  trails: UiTrail[]
  geometryById: Record<number, LatLng[]>
} {
  const trails: UiTrail[] = []
  const geometryById: Record<number, LatLng[]> = {}

  for (const row of extractApiTrailRows(payload)) {
    const trail = normalizeTrailRow(row)
    if (!trail)
      continue
    trails.push(trail)
    const geom = parseTrailGeometry(row.geometry)
    if (geom.length >= 2)
      geometryById[trail.id] = geom
  }

  return { trails, geometryById }
}
