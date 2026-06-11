import { onMount } from 'stx'
import { fetchSavedTrails, toggleSaveTrail } from '../assets/scripts/game-api'

/**
 * Saved trails (#969): hydrate the current user's bookmarks into the `tb`
 * store once per session, and expose an optimistic save/unsave toggle the
 * trail cards + detail page share.
 */

interface SavedTrailStoreLike {
  currentUserId: () => number
  hydrateSavedTrails: (ids: number[]) => void
  isTrailSaved: (trailId: number) => boolean
  setTrailSaved: (trailId: number, saved: boolean) => void
}

let started = false

export function useSavedTrails(tb: SavedTrailStoreLike | null) {
  onMount(async () => {
    if (!tb || started)
      return
    started = true
    const payload = await fetchSavedTrails(tb.currentUserId())
    if (payload && Array.isArray(payload.savedTrails))
      tb.hydrateSavedTrails(payload.savedTrails.map((s: any) => s.trailId))
  })

  async function onToggleSave(trailId: number) {
    if (!tb)
      return
    const was = tb.isTrailSaved(trailId)
    tb.setTrailSaved(trailId, !was) // optimistic
    const res = await toggleSaveTrail(trailId)
    if (res && res.success)
      tb.setTrailSaved(trailId, !!res.saved)
    else
      tb.setTrailSaved(trailId, was) // rollback
  }

  return { onToggleSave }
}
