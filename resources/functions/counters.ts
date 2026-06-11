/**
 * Pure denormalized-counter math (#973): `activities.kudos_count` from kudos
 * rows, `trails.rating`/`review_count` from trail reviews. Returns only the
 * rows whose persisted counters drifted from the recomputed truth, so callers
 * write the minimum. Ratings are the mean rounded to 1 decimal; a trail with
 * no reviews is honestly 0/0 (not a factory number).
 */

export interface ActivityCounterRow { id: number, kudos_count?: number | null }
export interface KudosCounterRow { activity_id?: number | null }
export interface TrailCounterRow { id: number, rating?: number | null, review_count?: number | null }
export interface ReviewCounterRow { trail_id?: number | null, rating?: number | null }

export interface CounterFixes {
  activityFixes: Array<{ id: number, kudos_count: number }>
  trailFixes: Array<{ id: number, rating: number, review_count: number }>
}

export function computeCounterFixes(input: {
  activities: ActivityCounterRow[]
  kudos: KudosCounterRow[]
  trails: TrailCounterRow[]
  reviews: ReviewCounterRow[]
}): CounterFixes {
  const kudosByActivity = new Map<number, number>()
  for (const k of input.kudos) {
    if (k.activity_id != null)
      kudosByActivity.set(k.activity_id, (kudosByActivity.get(k.activity_id) ?? 0) + 1)
  }

  const activityFixes: CounterFixes['activityFixes'] = []
  for (const a of input.activities) {
    const real = kudosByActivity.get(a.id) ?? 0
    if ((a.kudos_count ?? 0) !== real)
      activityFixes.push({ id: a.id, kudos_count: real })
  }

  const ratingSums = new Map<number, { sum: number, n: number }>()
  for (const r of input.reviews) {
    if (r.trail_id == null || typeof r.rating !== 'number')
      continue
    const s = ratingSums.get(r.trail_id) ?? { sum: 0, n: 0 }
    s.sum += r.rating
    s.n++
    ratingSums.set(r.trail_id, s)
  }

  const trailFixes: CounterFixes['trailFixes'] = []
  for (const t of input.trails) {
    const s = ratingSums.get(t.id)
    const reviewCount = s?.n ?? 0
    const rating = s ? Math.round((s.sum / s.n) * 10) / 10 : 0
    if ((t.review_count ?? 0) !== reviewCount || (t.rating ?? 0) !== rating)
      trailFixes.push({ id: t.id, rating, review_count: reviewCount })
  }

  return { activityFixes, trailFixes }
}
