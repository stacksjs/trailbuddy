import { onMount } from 'stx'
import { fetchFollows } from '../assets/scripts/game-api'

/**
 * Hydrate the current user's following list into the `tb` store so the feed's
 * "Following" filter and follow buttons reflect real data. Silent on failure.
 */

interface FollowStoreLike {
  currentUserId: () => number
  hydrateFollowing: (ids: number[]) => void
}

let started = false

export function useFollows(tb: FollowStoreLike | null) {
  onMount(async () => {
    if (!tb || started)
      return
    started = true
    try {
      const data = await fetchFollows(tb.currentUserId())
      if (data && Array.isArray(data.followingIds))
        tb.hydrateFollowing(data.followingIds)
    }
    catch {
      // ignore - keep empty following list
    }
  })
}
