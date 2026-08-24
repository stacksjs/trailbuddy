import type { EventSummary, EventType } from '../assets/scripts/events-api'
import { onDestroy, onMount, state } from 'stx'
import { createEvent, fetchEvents } from '../assets/scripts/events-api'
import { STANDARD_YARD_MILES, STANDARD_YARD_MINUTES } from '../functions/backyard'

/**
 * The events directory.
 *
 * Refreshed on a slow interval so a page left open on a laptop at the finish
 * still shows the right "still in" counts an hour later, without either the
 * viewer or a spectator having to reload.
 */

const REFRESH_MS = 30_000

/** The default a host is offered: one standard yard, starting on the hour. */
function nextTopOfHour(): string {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  return start.toISOString()
}

/** `2026-08-25T07:00` — the shape `<input type="datetime-local">` speaks. */
export function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()))
    return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function useEvents() {
  const events = state<EventSummary[]>([])
  const loading = state(true)
  const loadError = state<string | null>(null)
  const typeFilter = state<EventType | 'all'>('all')
  const statusFilter = state<'all' | 'live' | 'scheduled' | 'finished'>('all')

  const createOpen = state(false)
  const submitting = state(false)
  const createError = state<string | null>(null)

  const fName = state('')
  const fType = state<EventType>('backyard')
  const fLocation = state('')
  const fDescription = state('')
  const fStart = state(toLocalInputValue(nextTopOfHour()))
  const fYardMinutes = state(String(STANDARD_YARD_MINUTES))
  const fLoopDistance = state(String(STANDARD_YARD_MILES))
  const fVisibility = state<'public' | 'club' | 'private'>('public')

  let timer: ReturnType<typeof setInterval> | null = null

  async function load() {
    const result = await fetchEvents({ type: typeFilter(), status: statusFilter() })
    if (result === null) {
      loadError.set('Could not reach the events service.')
      loading.set(false)
      return
    }
    loadError.set(null)
    events.set(result)
    loading.set(false)
  }

  function applyFilter(next: { type?: EventType | 'all', status?: 'all' | 'live' | 'scheduled' | 'finished' }) {
    if (next.type !== undefined)
      typeFilter.set(next.type)
    if (next.status !== undefined)
      statusFilter.set(next.status)
    loading.set(true)
    void load()
  }

  function openCreate() {
    fName.set('')
    fType.set('backyard')
    fLocation.set('')
    fDescription.set('')
    fStart.set(toLocalInputValue(nextTopOfHour()))
    fYardMinutes.set(String(STANDARD_YARD_MINUTES))
    fLoopDistance.set(String(STANDARD_YARD_MILES))
    fVisibility.set('public')
    createError.set(null)
    createOpen.set(true)
  }

  function closeCreate() {
    createOpen.set(false)
    createError.set(null)
  }

  async function submitCreate() {
    if (submitting())
      return

    const name = fName().trim()
    if (name.length < 3) {
      createError.set('Give the event a name (at least 3 characters).')
      return
    }

    // `datetime-local` hands back a wall-clock string with no zone. Parsing it
    // as local time is correct — the host typed the time at the start line —
    // and converting to ISO here is what makes every spectator's countdown
    // agree regardless of where they are watching from.
    const startMs = Date.parse(fStart())
    if (!Number.isFinite(startMs)) {
      createError.set('Pick a start time.')
      return
    }

    const yardMinutes = Number.parseInt(fYardMinutes(), 10)
    const loopDistance = Number.parseFloat(fLoopDistance())
    if (!Number.isInteger(yardMinutes) || yardMinutes < 5 || yardMinutes > 720) {
      createError.set('A yard is between 5 and 720 minutes.')
      return
    }
    if (!Number.isFinite(loopDistance) || loopDistance < 0.1) {
      createError.set('Set the loop distance in miles.')
      return
    }

    submitting.set(true)
    createError.set(null)
    const result = await createEvent({
      name,
      event_type: fType(),
      start_time: new Date(startMs).toISOString(),
      yard_minutes: yardMinutes,
      loop_distance: loopDistance,
      visibility: fVisibility(),
      description: fDescription().trim() || null,
      location: fLocation().trim() || null,
    })
    submitting.set(false)

    if (result?.success && result.event) {
      createOpen.set(false)
      await load()
      return
    }

    createError.set(
      result?.fields ? Object.values(result.fields)[0] as string : (result?.error ?? 'Could not create the event.'),
    )
  }

  onMount(() => {
    void load()
    timer = setInterval(() => void load(), REFRESH_MS)
  })

  onDestroy(() => {
    if (timer)
      clearInterval(timer)
  })

  return {
    events,
    loading,
    loadError,
    typeFilter,
    statusFilter,
    applyFilter,
    reload: load,
    createOpen,
    submitting,
    createError,
    fName,
    fType,
    fLocation,
    fDescription,
    fStart,
    fYardMinutes,
    fLoopDistance,
    fVisibility,
    openCreate,
    closeCreate,
    submitCreate,
  }
}
