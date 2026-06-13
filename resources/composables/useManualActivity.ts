import { state } from 'stx'
import { createActivity } from '../assets/scripts/game-api'
import { paceString, parseDurationToSeconds } from '../functions/duration'

/**
 * Manual activity entry (#955) — log a run/hike after the fact with no GPS
 * track. Reuses POST /api/activities (gpx optional); pace is computed from
 * distance + duration, and the created row (with its real backend id) is
 * inserted into the feed store optimistically.
 */

interface ManualStoreLike {
  currentUserId: () => number
  findUser: (id: number) => { name: string } | undefined
  findTrail: (id: number) => { id: number, name: string } | undefined
  addActivity: (activity: Record<string, unknown>) => void
}

const MANUAL_TYPES = ['Trail Run', 'Hike', 'Walk', 'Bike']

export function useManualActivity(tb: ManualStoreLike | null) {
  const manualOpen = state(false)
  const submitting = state(false)
  const manualError = state<string | null>(null)

  const mType = state('Trail Run')
  const mDistance = state('')
  const mDuration = state('')
  const mElevation = state('')
  const mTrailId = state('')
  const mDate = state('')
  const mNotes = state('')
  const mVisibility = state('public')

  function openManualEntry() {
    mType.set('Trail Run')
    mDistance.set('')
    mDuration.set('')
    mElevation.set('')
    mTrailId.set('')
    mDate.set('')
    mNotes.set('')
    mVisibility.set('public')
    manualError.set(null)
    manualOpen.set(true)
  }

  function closeManualEntry() {
    manualOpen.set(false)
    manualError.set(null)
  }

  async function submitManualEntry() {
    if (!tb || submitting())
      return
    const distance = Number.parseFloat(mDistance())
    const duration = mDuration().trim()
    const seconds = parseDurationToSeconds(duration)
    const elevation = Math.round(Number.parseFloat(mElevation() || '0'))

    if (!MANUAL_TYPES.includes(mType())) {
      manualError.set('Pick an activity type')
      return
    }
    if (!Number.isFinite(distance) || distance <= 0) {
      manualError.set('Distance must be a positive number of miles')
      return
    }
    if (seconds === null) {
      manualError.set('Duration must look like 45:30 or 1:45:30')
      return
    }
    if (!Number.isFinite(elevation) || elevation < 0) {
      manualError.set('Elevation must be a non-negative number of feet')
      return
    }

    const trailId = mTrailId() ? Number(mTrailId()) : null
    const trail = trailId ? tb.findTrail(trailId) : undefined
    const pace = paceString(distance, seconds)
    // Date-only input → pin to midday local so timezone shifts can't move the day.
    const completedAt = mDate()
      ? new Date(`${mDate()}T12:00:00`).toISOString()
      : new Date().toISOString()
    const notes = mNotes().trim()

    submitting.set(true)
    manualError.set(null)
    const created = await createActivity({
      user_id: tb.currentUserId(),
      trail_id: trailId,
      activity_type: mType(),
      distance: Number(distance.toFixed(2)),
      duration,
      moving_time: duration,
      pace,
      elevation,
      notes: notes || undefined,
      visibility: mVisibility(),
      completed_at: completedAt,
    })
    submitting.set(false)

    if (!created) {
      manualError.set('Could not save the activity — is the API running?')
      return
    }

    const me = tb.findUser(tb.currentUserId())
    const when = new Date(completedAt).toLocaleDateString()
    tb.addActivity({
      id: created.id,
      user_id: tb.currentUserId(),
      userName: me?.name ?? 'You',
      trail_id: trailId,
      trail_name: trail?.name ?? `${mType()} Activity`,
      title: trail ? `${mType()} at ${trail.name}` : `${mType()} — ${when}`,
      activityType: mType(),
      distance: Number(distance.toFixed(2)),
      duration,
      moving_time: duration,
      pace,
      elevation_gain: elevation,
      calories: Math.round(seconds / 60 * 10),
      heartRateAvg: null,
      heartRateMax: null,
      cadence: null,
      splits: [],
      kudos_count: 0,
      comments: [],
      notes,
      visibility: mVisibility(),
      hasGps: false,
    })
    manualOpen.set(false)
  }

  return {
    manualOpen,
    submitting,
    manualError,
    mType,
    mDistance,
    mDuration,
    mElevation,
    mTrailId,
    mDate,
    mNotes,
    mVisibility,
    openManualEntry,
    closeManualEntry,
    submitManualEntry,
  }
}
