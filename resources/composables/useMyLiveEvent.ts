import type { EventSummary } from '../assets/scripts/events-api'
import { derived, onDestroy, onMount, state } from 'stx'
import { fetchEvents, reportLap } from '../assets/scripts/events-api'
import { currentYard, formatClock, msToNextStart } from '../functions/backyard'

/**
 * The live event the person recording is actually running.
 *
 * The recorder is where a backyard runner spends the hour, so the corral clock
 * has to be there too — not one tab away on the live board. This finds the one
 * live event they are entered in, keeps its countdown honest, and gives them a
 * single button to bank the yard they just finished.
 *
 * Refreshed slowly. A yard is an hour long; the clock between polls is derived
 * locally from the event's start time, which is the same arithmetic the server
 * uses, so the two cannot drift.
 */

const REFRESH_MS = 60_000

export function useMyLiveEvent() {
  const event = state<EventSummary | null>(null)
  const yardsBanked = state(0)
  const banking = state(false)
  const bankError = state<string | null>(null)
  const tick = state(0)

  let refresh: ReturnType<typeof setInterval> | null = null
  let clock: ReturnType<typeof setInterval> | null = null

  async function load() {
    const events = await fetchEvents({ status: 'live' })
    if (!events) {
      event.set(null)
      return
    }
    // Entered, live, and lap-based. A group run has no yards to bank.
    const mine = events.find(candidate => candidate.isEntered && candidate.type === 'backyard') ?? null
    event.set(mine)
    if (mine)
      yardsBanked.set(mine.leaderYards >= 0 ? yardsBanked() : 0)
  }

  const schedule = derived(() => {
    const current = event()
    if (!current)
      return null
    return {
      startTime: current.startTime,
      yardMinutes: current.yardMinutes,
      loopDistance: current.loopDistance,
      maxYards: current.maxYards,
    }
  })

  const yard = derived(() => {
    tick()
    const current = schedule()
    return current ? currentYard(current) : 0
  })

  const countdown = derived(() => {
    tick()
    const current = schedule()
    return current ? formatClock(msToNextStart(current)) : '—'
  })

  async function bankYard() {
    const current = event()
    if (!current || banking())
      return
    banking.set(true)
    bankError.set(null)
    const result = await reportLap(current.id, { finished_at: new Date().toISOString() })
    banking.set(false)
    if (!result?.success) {
      bankError.set(result?.error ?? 'Could not record that yard.')
      return
    }
    yardsBanked.set(result.yardsCompleted ?? yardsBanked() + 1)
    void load()
  }

  onMount(() => {
    void load()
    refresh = setInterval(() => void load(), REFRESH_MS)
    clock = setInterval(() => tick.set(tick() + 1), 1000)
  })

  onDestroy(() => {
    if (refresh)
      clearInterval(refresh)
    if (clock)
      clearInterval(clock)
  })

  return { event, yard, countdown, yardsBanked, banking, bankError, bankYard, reload: load }
}
