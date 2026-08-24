/**
 * Backyard-ultra timing.
 *
 * The format is a clock, not a course. Every runner starts the same loop — a
 * *yard* — at the top of each interval, and has that whole interval to finish
 * it and be back in the corral for the next start. Miss the start and you are
 * out. The race ends when exactly one runner completes a yard that nobody else
 * completes; that runner is the winner and everybody else is, by long-standing
 * convention, a DNF.
 *
 * Everything here is pure and derived from `startTime` + `yardMinutes`, so the
 * server, the live page, and the recorder all agree about which yard it is
 * without any of them holding a timer. Both sides import this module rather
 * than reimplementing the arithmetic — a live board and a phone that disagree
 * about the corral clock is the one bug this format cannot tolerate.
 */

export interface BackyardSchedule {
  /** ISO timestamp of yard 1's start. */
  startTime: string
  /** Minutes between starts. 60 is the standard yard. */
  yardMinutes: number
  /** Miles in one yard. 4.167 mi (6.706 km) is the standard. */
  loopDistance?: number
  /** Optional cap, for a capped rather than last-standing format. */
  maxYards?: number | null
}

export interface BackyardEntrantState {
  userId: number
  name?: string
  status: 'registered' | 'running' | 'timed_out' | 'withdrawn' | 'dnf' | 'winner'
  yardsCompleted: number
  lastLapAt?: string | null
  exitNote?: string | null
}

export interface BackyardStanding extends BackyardEntrantState {
  rank: number
  /** Still eligible to start the next yard. */
  stillIn: boolean
  /** Miles credited, from completed yards. */
  miles: number
}

/** The classic yard: 6.706 km, the distance that makes 24 yards ≈ 100 miles. */
export const STANDARD_YARD_MILES = 4.167

export const STANDARD_YARD_MINUTES = 60

function intervalMs(schedule: BackyardSchedule): number {
  const minutes = Number(schedule.yardMinutes)
  // A zero or negative interval would divide the clock by zero and report an
  // infinite yard number, so fall back to the standard rather than propagate.
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : STANDARD_YARD_MINUTES) * 60_000
}

function startMs(schedule: BackyardSchedule): number {
  const parsed = Date.parse(schedule.startTime)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

/** ISO timestamp at which `yard` begins. Yard 1 is the event's start time. */
export function yardStartsAt(schedule: BackyardSchedule, yard: number): string {
  const start = startMs(schedule)
  if (!Number.isFinite(start))
    return schedule.startTime
  return new Date(start + (Math.max(1, yard) - 1) * intervalMs(schedule)).toISOString()
}

/**
 * Which yard is under way at `now`.
 *
 * Returns 0 before the event starts, which is what lets the UI show a
 * countdown to yard 1 rather than pretending a yard is in progress.
 */
export function currentYard(schedule: BackyardSchedule, now: number = Date.now()): number {
  const start = startMs(schedule)
  if (!Number.isFinite(start) || now < start)
    return 0
  return Math.floor((now - start) / intervalMs(schedule)) + 1
}

/** Milliseconds until the next yard starts. Counts down to yard 1 pre-race. */
export function msToNextStart(schedule: BackyardSchedule, now: number = Date.now()): number {
  const start = startMs(schedule)
  if (!Number.isFinite(start))
    return 0
  if (now < start)
    return start - now
  const interval = intervalMs(schedule)
  const elapsedInYard = (now - start) % interval
  return interval - elapsedInYard
}

/** Milliseconds since the current yard's gun. 0 before the event starts. */
export function msIntoCurrentYard(schedule: BackyardSchedule, now: number = Date.now()): number {
  const start = startMs(schedule)
  if (!Number.isFinite(start) || now < start)
    return 0
  return (now - start) % intervalMs(schedule)
}

/**
 * How many yards a runner must already have banked to still be in the race.
 *
 * While yard N is running, a runner is on the course for N and has therefore
 * completed N-1. That is the whole eligibility rule: anyone short of N-1 did
 * not make the last corral.
 */
export function yardsRequiredToBeIn(schedule: BackyardSchedule, now: number = Date.now()): number {
  return Math.max(0, currentYard(schedule, now) - 1)
}

export function isStillIn(
  entrant: BackyardEntrantState,
  schedule: BackyardSchedule,
  now: number = Date.now(),
): boolean {
  if (entrant.status === 'winner')
    return true
  if (entrant.status !== 'registered' && entrant.status !== 'running')
    return false
  return entrant.yardsCompleted >= yardsRequiredToBeIn(schedule, now)
}

/**
 * Rank the field.
 *
 * Yards first, because that is the only thing the format counts. Ties break on
 * who is still in — a runner on 14 yards who made the corral is ahead of one
 * who did not — then on the earlier last lap, which rewards the runner who has
 * been banking more rest.
 */
export function standings(
  entrants: BackyardEntrantState[],
  schedule: BackyardSchedule,
  now: number = Date.now(),
): BackyardStanding[] {
  const miles = Number(schedule.loopDistance) > 0 ? Number(schedule.loopDistance) : STANDARD_YARD_MILES

  return entrants
    .map(entrant => ({
      ...entrant,
      stillIn: isStillIn(entrant, schedule, now),
      miles: Math.round(entrant.yardsCompleted * miles * 100) / 100,
      rank: 0,
    }))
    .sort((a, b) => {
      if (b.yardsCompleted !== a.yardsCompleted)
        return b.yardsCompleted - a.yardsCompleted
      if (a.stillIn !== b.stillIn)
        return a.stillIn ? -1 : 1
      const aLap = a.lastLapAt ? Date.parse(a.lastLapAt) : Number.POSITIVE_INFINITY
      const bLap = b.lastLapAt ? Date.parse(b.lastLapAt) : Number.POSITIVE_INFINITY
      if (aLap !== bLap)
        return aLap - bLap
      return a.userId - b.userId
    })
    .map((entrant, index) => ({ ...entrant, rank: index + 1 }))
}

export interface BackyardOutcome {
  /** The event has resolved and this runner won it. */
  winnerId: number | null
  /** Everyone still eligible to start the next yard. */
  stillIn: number
  /** Yards the leader has banked. */
  leaderYards: number
  finished: boolean
}

/**
 * Has the race resolved?
 *
 * A backyard ultra ends when one runner finishes a yard that nobody else
 * finishes. Concretely: exactly one runner is still eligible, and they are
 * strictly ahead of every other runner. One runner left who is merely *level*
 * with a runner who just timed out has not won yet — they still have to go out
 * and complete the next yard alone, which is the format's whole point.
 *
 * A capped event (`maxYards`) instead resolves the moment the leader reaches
 * the cap, and only when they do so alone.
 */
export function resolveOutcome(
  entrants: BackyardEntrantState[],
  schedule: BackyardSchedule,
  now: number = Date.now(),
): BackyardOutcome {
  const ranked = standings(entrants, schedule, now)
  const alive = ranked.filter(entrant => entrant.stillIn)
  const leaderYards = ranked[0]?.yardsCompleted ?? 0
  const declared = ranked.find(entrant => entrant.status === 'winner')

  if (declared)
    return { winnerId: declared.userId, stillIn: alive.length, leaderYards, finished: true }

  // Nobody left: the field emptied without a winner, which happens when the
  // last two runners time out on the same yard. The format calls that "no
  // winner", and saying so is more honest than promoting a runner-up.
  if (alive.length === 0 && leaderYards > 0)
    return { winnerId: null, stillIn: 0, leaderYards, finished: true }

  if (alive.length !== 1)
    return { winnerId: null, stillIn: alive.length, leaderYards, finished: false }

  const [last] = alive
  const bestOther = ranked
    .filter(entrant => entrant.userId !== last.userId)
    .reduce((best, entrant) => Math.max(best, entrant.yardsCompleted), 0)

  const cap = schedule.maxYards ?? null
  const reachedCap = cap !== null && last.yardsCompleted >= cap
  const outrightLead = last.yardsCompleted > bestOther

  if (outrightLead && (cap === null || reachedCap))
    return { winnerId: last.userId, stillIn: 1, leaderYards, finished: true }

  return { winnerId: null, stillIn: 1, leaderYards, finished: false }
}

/** `1:04:12` / `41:08`. The corral clock, and every lap split. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}
