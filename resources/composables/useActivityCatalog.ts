import { onMount, state } from 'stx'

/**
 * Hydrate the `tb` store's activity feed from the live API
 * (`GET /api/activities`), mirroring useTrailCatalog/useTerritoryCatalog. Falls
 * back silently to seed data when the API is empty/unreachable.
 */

interface ActivityStoreLike {
  activities: () => unknown[]
  hydrateActivitiesFromApi: (activities: unknown[]) => void
}

interface ApiActivity {
  id: number
  userId: number
  userName: string
  trailId: number | null
  trailName: string | null
  title: string
  activityType: string
  distance: number
  duration: string
  movingTime: string
  pace: string | null
  elevationGain: number
  calories: number
  kudosCount: number
  completedAt: string | null
  createdAt: string | null
}

export const activitySource = state<'api' | 'seed'>('seed')
export const activityError = state<string | null>(null)

let started = false

export function useActivityCatalog(tb: ActivityStoreLike | null) {
  onMount(async () => {
    if (!tb || started)
      return
    started = true
    try {
      const res = await fetch('/api/activities?limit=200')
      if (!res.ok)
        throw new Error(`Activities API returned ${res.status}`)
      const payload = await res.json()
      const rows: ApiActivity[] = Array.isArray(payload?.activities) ? payload.activities : []
      if (!rows.length)
        return

      const activities = rows.map(a => ({
        id: a.id,
        user_id: a.userId,
        userName: a.userName || 'Unknown',
        trail_id: a.trailId ?? null,
        trail_name: a.trailName ?? `${a.activityType} Activity`,
        title: a.title,
        activityType: a.activityType,
        distance: a.distance,
        duration: a.duration,
        moving_time: a.movingTime ?? a.duration,
        pace: a.pace ?? '--',
        elevation_gain: a.elevationGain ?? 0,
        calories: a.calories ?? 0,
        heartRateAvg: null,
        heartRateMax: null,
        cadence: null,
        splits: [],
        kudos_count: a.kudosCount ?? 0,
        comments: [],
        created_at: a.createdAt ?? a.completedAt ?? new Date().toISOString(),
      }))

      tb.hydrateActivitiesFromApi(activities)
      activitySource.set('api')
    }
    catch (err) {
      activityError.set(err instanceof Error ? err.message : 'Could not load activities')
      activitySource.set('seed')
    }
  })
}
