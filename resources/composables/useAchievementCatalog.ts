import { onMount, state } from 'stx'
import { fetchAchievements } from '../assets/scripts/game-api'

/**
 * Hydrate the `wl` store's achievements from the live unlock engine
 * (`GET /api/users/{id}/achievements`, #982), mirroring useActivityCatalog.
 * Falls back silently to seed data when the API is empty/unreachable.
 */

interface AchievementStoreLike {
  currentUserId: () => number
  hydrateAchievements: (achievements: unknown[]) => void
}

export const achievementSource = state<'api' | 'seed'>('seed')

let achievementsStarted = false

export function useAchievementCatalog(wl: AchievementStoreLike | null) {
  onMount(async () => {
    if (!wl || achievementsStarted)
      return
    achievementsStarted = true
    const payload = await fetchAchievements(wl.currentUserId())
    const rows = Array.isArray(payload?.achievements) ? payload.achievements : []
    if (!rows.length)
      return
    wl.hydrateAchievements(rows.map((a: any) => ({
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
