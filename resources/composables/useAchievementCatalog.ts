import { onMount, state } from 'stx'
import { fetchAchievements } from '../assets/scripts/game-api'

/**
 * Hydrate the `tb` store's achievements from the live unlock engine
 * (`GET /api/users/{id}/achievements`, #982), mirroring useActivityCatalog.
 * Falls back silently to seed data when the API is empty/unreachable.
 */

interface AchievementStoreLike {
  currentUserId: () => number
  hydrateAchievements: (achievements: unknown[]) => void
}

export const achievementSource = state<'api' | 'seed'>('seed')

let started = false

export function useAchievementCatalog(tb: AchievementStoreLike | null) {
  onMount(async () => {
    if (!tb || started)
      return
    started = true
    const payload = await fetchAchievements(tb.currentUserId())
    const rows = Array.isArray(payload?.achievements) ? payload.achievements : []
    if (!rows.length)
      return
    tb.hydrateAchievements(rows.map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      progress: a.progress ?? 0,
      total: a.target ?? 1,
      unlockedAt: a.unlockedAt ?? null,
    })))
    achievementSource.set('api')
  })
}
