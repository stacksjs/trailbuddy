/**
 * Shared event plumbing.
 *
 * The live board, the detail page, and lap reporting all need the same three
 * things — may this viewer see the event, what does the field look like right
 * now, and has anybody dropped since we last looked — so they live here rather
 * than being written three times with three subtly different eligibility rules.
 */

import Event from '../../Models/Event'
import EventEntrant from '../../Models/EventEntrant'
import EventLap from '../../Models/EventLap'

import type { BackyardEntrantState, BackyardSchedule } from '../../../resources/functions/backyard'
import { currentYard, isStillIn, msIntoCurrentYard, msToNextStart, resolveOutcome, standings, yardStartsAt } from '../../../resources/functions/backyard'

export interface EventRow {
  id: number
  host_id: number
  club_id: number | null
  trail_id: number | null
  name: string
  description: string | null
  location: string | null
  event_type: string
  status: string
  visibility: string
  loop_distance: number
  loop_route: string | null
  yard_minutes: number
  start_time: string
  max_yards: number | null
  winner_id: number | null
  created_at?: string
}

export function scheduleOf(event: EventRow): BackyardSchedule {
  return {
    startTime: event.start_time,
    yardMinutes: event.yard_minutes,
    loopDistance: event.loop_distance,
    maxYards: event.max_yards,
  }
}

/**
 * May this viewer see this event?
 *
 * Public is public. A club event is for that club. A private one is for the
 * host and the people actually entered — checked against the entrant rows
 * rather than a guest list, so somebody who withdrew keeps access to the
 * result of a race they ran.
 */
export async function canViewEvent(
  event: EventRow,
  sessionUser: number | null,
  entrantIds: number[],
): Promise<boolean> {
  if (event.visibility === 'public')
    return true
  if (sessionUser === null)
    return false
  if (event.host_id === sessionUser)
    return true
  if (event.visibility === 'club') {
    if (event.club_id === null)
      return false
    const membership = await ClubMember
      .where('club_id', '=', event.club_id)
      .where('user_id', '=', sessionUser)
      .first()
    return !!membership
  }
  return entrantIds.includes(sessionUser)
}

/**
 * Bring the field up to date with the clock.
 *
 * Nothing runs on a timer: a runner who misses a corral is not "timed out"
 * until somebody looks. That somebody is whoever opened the live page, so this
 * runs on read — persisting the transition once, so the exit is recorded with
 * the yard it happened on rather than recomputed forever.
 *
 * Only a live event advances. A scheduled one has no corral yet, and a
 * finished one is a result, not a race.
 */
export async function syncFieldStatus(
  event: EventRow,
  entrants: any[],
  now: number = Date.now(),
): Promise<{ event: EventRow, entrants: any[] }> {
  if (event.status !== 'live')
    return { event, entrants }

  const schedule = scheduleOf(event)
  const updated: any[] = []

  for (const entrant of entrants) {
    const state: BackyardEntrantState = {
      userId: entrant.user_id,
      status: entrant.status,
      yardsCompleted: entrant.yards_completed ?? 0,
      lastLapAt: entrant.last_lap_at,
    }

    if ((entrant.status === 'registered' || entrant.status === 'running') && !isStillIn(state, schedule, now)) {
      const yards = entrant.yards_completed ?? 0
      // A runner who never started a yard did not time out — they did not
      // start. Recording that as "timed out" credits them with an attempt
      // they never made.
      const status = yards > 0 ? 'timed_out' : 'dnf'
      await EventEntrant.update(entrant.id, { status }).catch(() => undefined)
      updated.push({ ...entrant, status })
      continue
    }

    updated.push(entrant)
  }

  const outcome = resolveOutcome(
    updated.map((entrant: any) => ({
      userId: entrant.user_id,
      status: entrant.status,
      yardsCompleted: entrant.yards_completed ?? 0,
      lastLapAt: entrant.last_lap_at,
    })),
    schedule,
    now,
  )

  if (!outcome.finished)
    return { event, entrants: updated }

  await Event.update(event.id, { status: 'finished', winner_id: outcome.winnerId }).catch(() => undefined)
  const finishedEvent = { ...event, status: 'finished', winner_id: outcome.winnerId }

  if (outcome.winnerId !== null) {
    const winner = updated.find((entrant: any) => entrant.user_id === outcome.winnerId)
    if (winner && winner.status !== 'winner') {
      await EventEntrant.update(winner.id, { status: 'winner' }).catch(() => undefined)
      winner.status = 'winner'
    }
  }

  return { event: finishedEvent, entrants: updated }
}

/** The whole live payload: clock, standings, and the most recent laps. */
export async function buildLiveBoard(
  event: EventRow,
  entrants: any[],
  options: { lapLimit?: number, now?: number } = {},
) {
  const now = options.now ?? Date.now()
  const schedule = scheduleOf(event)

  const userIds = [...new Set(entrants.map((entrant: any) => entrant.user_id))]
  const users = userIds.length ? await User.whereIn('id', userIds).get() : []
  const nameOf = new Map((users ?? []).map((user: any) => [user.id, user.name]))

  const board = standings(
    entrants.map((entrant: any) => ({
      userId: entrant.user_id,
      name: nameOf.get(entrant.user_id) ?? 'Unknown',
      status: entrant.status,
      yardsCompleted: entrant.yards_completed ?? 0,
      lastLapAt: entrant.last_lap_at,
      exitNote: entrant.exit_note,
    })),
    schedule,
    now,
  )

  const bibOf = new Map(entrants.map((entrant: any) => [entrant.user_id, entrant.bib]))

  const laps = (await EventLap.where('event_id', '=', event.id).get()) ?? []
  const recentLaps = [...laps]
    .sort((a: any, b: any) => Date.parse(b.finished_at ?? '') - Date.parse(a.finished_at ?? ''))
    .slice(0, options.lapLimit ?? 40)
    .map((lap: any) => ({
      userId: lap.user_id,
      name: nameOf.get(lap.user_id) ?? 'Unknown',
      yard: lap.yard_number,
      finishedAt: lap.finished_at,
      durationSeconds: lap.duration_seconds,
      distance: lap.distance,
      activityId: lap.activity_id,
      source: lap.source,
    }))

  const yard = event.status === 'live' ? currentYard(schedule, now) : 0
  const totalMiles = board.reduce((sum, entry) => sum + entry.miles, 0)

  return {
    // `serverTime` lets the page correct for a clock that is minutes off. A
    // spectator whose laptop is slow would otherwise watch a corral countdown
    // that disagrees with the one at the start line.
    serverTime: new Date(now).toISOString(),
    status: event.status,
    currentYard: yard,
    yardStartsAt: yardStartsAt(schedule, Math.max(1, yard)),
    nextYardStartsAt: yardStartsAt(schedule, Math.max(1, yard) + 1),
    msToNextStart: msToNextStart(schedule, now),
    msIntoYard: msIntoCurrentYard(schedule, now),
    entrantCount: entrants.length,
    stillIn: board.filter(entry => entry.stillIn).length,
    leaderYards: board[0]?.yardsCompleted ?? 0,
    totalMiles: Math.round(totalMiles * 10) / 10,
    winnerId: event.winner_id,
    standings: board.map(entry => ({ ...entry, bib: bibOf.get(entry.userId) ?? null })),
    recentLaps,
  }
}
