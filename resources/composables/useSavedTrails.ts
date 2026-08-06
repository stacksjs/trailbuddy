import { onMount } from 'stx'
import { fetchSavedTrails, toggleSaveTrail } from '../assets/scripts/game-api'

/**
 * Saved trails (#969): hydrate the current user's bookmarks into the `wl`
 * store once per session, and expose an optimistic save/unsave toggle the
 * trail cards + detail page share.
 */

interface SavedTrailStoreLike {
  currentUserId: () => number
  hydrateSavedTrails: (ids: number[]) => void
  isTrailSaved: (trailId: number) => boolean
  setTrailSaved: (trailId: number, saved: boolean) => void
}

let savedTrailsStarted = false

export function useSavedTrails(wl: SavedTrailStoreLike | null) {
  onMount(async () => {
    if (!wl || savedTrailsStarted)
      return
    savedTrailsStarted = true
    const payload = await fetchSavedTrails(wl.currentUserId())
    if (payload && Array.isArray(payload.savedTrails))
      wl.hydrateSavedTrails(payload.savedTrails.map((s: any) => s.trailId))
  })

  async function onToggleSave(trailId: number) {
    if (!wl)
      return
    const was = wl.isTrailSaved(trailId)
    wl.setTrailSaved(trailId, !was) // optimistic
    const res = await toggleSaveTrail(trailId)
    if (res && res.success)
      wl.setTrailSaved(trailId, !!res.saved)
    else
      wl.setTrailSaved(trailId, was) // rollback
  }

  return { onToggleSave }
}
