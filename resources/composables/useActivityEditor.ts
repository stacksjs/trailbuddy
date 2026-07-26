import { state } from 'stx'
import { deleteActivity, updateActivity } from '../assets/scripts/game-api'
import { paceString, parseDurationToSeconds } from '../functions/duration'

/**
 * Owner edit/delete for the activity detail page (#954). Descriptive fields
 * (type, notes) are always editable; measured fields (distance, duration,
 * elevation) only for manual entries - the backend rejects them on
 * GPS-recorded runs, so the form doesn't offer them either.
 */

interface EditorStoreLike {
  patchActivity: (id: number, fields: Record<string, unknown>) => void
  removeActivity: (id: number) => void
}

export interface EditableActivity {
  id: number
  activityType: string
  distance: number
  duration: string
  elevation_gain: number
  trail_name?: string
  notes?: string
  visibility?: string
  hasGps?: boolean
}

export function useActivityEditor(tb: EditorStoreLike | null) {
  const editing = state(false)
  const saving = state(false)
  const deleted = state(false)
  const confirmingDelete = state(false)
  const editorError = state<string | null>(null)

  const formType = state('Trail Run')
  const formNotes = state('')
  const formDistance = state('')
  const formDuration = state('')
  const formElevation = state('')
  const formVisibility = state('public')

  function openEditor(a: EditableActivity) {
    formType.set(a.activityType)
    formNotes.set(a.notes ?? '')
    formDistance.set(String(a.distance ?? ''))
    formDuration.set(a.duration ?? '')
    formElevation.set(String(a.elevation_gain ?? 0))
    formVisibility.set(a.visibility ?? 'public')
    editorError.set(null)
    confirmingDelete.set(false)
    editing.set(true)
  }

  function closeEditor() {
    editing.set(false)
    editorError.set(null)
  }

  async function saveEdit(a: EditableActivity) {
    if (!tb || saving())
      return
    const payload: Record<string, unknown> = {
      activity_type: formType(),
      notes: formNotes().trim() || null,
      visibility: formVisibility(),
    }

    if (!a.hasGps) {
      const distance = Number.parseFloat(formDistance())
      const elevation = Math.round(Number.parseFloat(formElevation() || '0'))
      const duration = formDuration().trim()
      const seconds = parseDurationToSeconds(duration)
      if (!Number.isFinite(distance) || distance <= 0) {
        editorError.set('Distance must be a positive number of miles')
        return
      }
      if (seconds === null) {
        editorError.set('Duration must look like 45:30 or 1:45:30')
        return
      }
      if (!Number.isFinite(elevation) || elevation < 0) {
        editorError.set('Elevation must be a non-negative number of feet')
        return
      }
      payload.distance = Number(distance.toFixed(2))
      payload.duration = duration
      payload.moving_time = duration
      payload.pace = paceString(distance, seconds)
      payload.elevation = elevation
    }

    saving.set(true)
    editorError.set(null)
    const res = await updateActivity(a.id, payload)
    saving.set(false)
    if (res && res.success && res.activity) {
      const updated = res.activity
      tb.patchActivity(a.id, {
        activityType: updated.activityType,
        notes: updated.notes ?? '',
        distance: updated.distance,
        duration: updated.duration,
        moving_time: updated.movingTime ?? updated.duration,
        pace: updated.pace ?? '--',
        elevation_gain: updated.elevation ?? 0,
        visibility: updated.visibility ?? 'public',
        title: a.trail_name && !a.trail_name.endsWith('Activity')
          ? `${updated.activityType} at ${a.trail_name}`
          : updated.activityType,
      })
      editing.set(false)
    }
    else {
      editorError.set(res?.error ?? 'Could not save changes')
    }
  }

  /** Two-step delete: first click arms the confirm, second click deletes. */
  async function deleteRun(a: EditableActivity) {
    if (!tb || saving())
      return
    if (!confirmingDelete()) {
      confirmingDelete.set(true)
      return
    }
    confirmingDelete.set(false)
    saving.set(true)
    const ok = await deleteActivity(a.id)
    saving.set(false)
    if (ok) {
      deleted.set(true)
      tb.removeActivity(a.id)
    }
    else {
      editorError.set('Could not delete activity')
    }
  }

  function cancelDelete() {
    confirmingDelete.set(false)
  }

  return {
    editing,
    saving,
    deleted,
    confirmingDelete,
    editorError,
    formType,
    formNotes,
    formDistance,
    formDuration,
    formElevation,
    formVisibility,
    openEditor,
    closeEditor,
    saveEdit,
    deleteRun,
    cancelDelete,
  }
}
