import type { BackyardEntrantState, BackyardSchedule } from '../../resources/functions/backyard'
import { describe, expect, it } from 'bun:test'
import {
  currentYard,
  formatClock,
  isStillIn,
  msIntoCurrentYard,
  msToNextStart,
  resolveOutcome,
  STANDARD_YARD_MILES,
  standings,
  yardsRequiredToBeIn,
  yardStartsAt,
} from '../../resources/functions/backyard'

/**
 * A backyard ultra is decided by a clock, so these are the rules the clock
 * enforces. Every case below is one somebody actually loses a race on.
 */

const START = '2026-08-25T07:00:00.000Z'
const START_MS = Date.parse(START)
const HOUR = 3_600_000

const schedule: BackyardSchedule = {
  startTime: START,
  yardMinutes: 60,
  loopDistance: STANDARD_YARD_MILES,
}

function runner(userId: number, yards: number, extra: Partial<BackyardEntrantState> = {}): BackyardEntrantState {
  return {
    userId,
    status: 'running',
    yardsCompleted: yards,
    lastLapAt: new Date(START_MS + yards * HOUR - 600_000).toISOString(),
    ...extra,
  }
}

describe('the corral clock', () => {
  it('reports no yard before the gun', () => {
    expect(currentYard(schedule, START_MS - 1)).toBe(0)
  })

  it('starts yard 1 exactly on the start time', () => {
    expect(currentYard(schedule, START_MS)).toBe(1)
  })

  it('is still yard 1 one second before the hour is up', () => {
    expect(currentYard(schedule, START_MS + HOUR - 1000)).toBe(1)
  })

  it('rolls to yard 2 on the hour', () => {
    expect(currentYard(schedule, START_MS + HOUR)).toBe(2)
  })

  it('derives each yard start from the first', () => {
    expect(yardStartsAt(schedule, 1)).toBe(new Date(START_MS).toISOString())
    expect(yardStartsAt(schedule, 14)).toBe(new Date(START_MS + 13 * HOUR).toISOString())
  })

  it('counts down to yard 1 before the race begins', () => {
    expect(msToNextStart(schedule, START_MS - 90_000)).toBe(90_000)
  })

  it('counts down to the next corral once running', () => {
    expect(msToNextStart(schedule, START_MS + 19 * 60_000)).toBe(41 * 60_000)
    expect(msIntoCurrentYard(schedule, START_MS + 19 * 60_000)).toBe(19 * 60_000)
  })

  it('survives a nonsense interval rather than reporting an infinite yard', () => {
    const broken: BackyardSchedule = { startTime: START, yardMinutes: 0 }
    expect(currentYard(broken, START_MS + HOUR)).toBe(2)
  })

  it('survives an unparseable start time', () => {
    const broken: BackyardSchedule = { startTime: 'not a date', yardMinutes: 60 }
    expect(currentYard(broken, START_MS)).toBe(0)
    expect(msToNextStart(broken, START_MS)).toBe(0)
  })
})

describe('who is still in', () => {
  it('requires the previous yard to be banked', () => {
    // Yard 3 is under way, so a runner must have completed 2.
    const during3 = START_MS + 2 * HOUR + 60_000
    expect(yardsRequiredToBeIn(schedule, during3)).toBe(2)
    expect(isStillIn(runner(1, 2), schedule, during3)).toBe(true)
    expect(isStillIn(runner(2, 1), schedule, during3)).toBe(false)
  })

  it('keeps a runner in during the yard they are out on', () => {
    // Mid-yard-2 with one yard banked: on the course, not behind.
    expect(isStillIn(runner(1, 1), schedule, START_MS + HOUR + 60_000)).toBe(true)
  })

  it('drops a runner the moment the next gun goes without their lap', () => {
    expect(isStillIn(runner(1, 1), schedule, START_MS + 2 * HOUR)).toBe(false)
  })

  it('treats a withdrawal as out regardless of the clock', () => {
    expect(isStillIn(runner(1, 5, { status: 'withdrawn' }), schedule, START_MS)).toBe(false)
  })

  it('keeps a declared winner in', () => {
    expect(isStillIn(runner(1, 20, { status: 'winner' }), schedule, START_MS + 99 * HOUR)).toBe(true)
  })
})

describe('standings', () => {
  const now = START_MS + 14 * HOUR + 60_000

  it('ranks by yards, then by who is still in', () => {
    const board = standings(
      [
        runner(3, 13, { status: 'timed_out' }),
        runner(1, 14),
        runner(2, 14, { status: 'timed_out' }),
      ],
      schedule,
      now,
    )

    expect(board.map(entry => entry.userId)).toEqual([1, 2, 3])
    expect(board[0]!.rank).toBe(1)
    expect(board[0]!.stillIn).toBe(true)
    expect(board[1]!.stillIn).toBe(false)
  })

  it('credits miles from banked yards', () => {
    const [leader] = standings([runner(1, 24)], schedule, START_MS + 24 * HOUR)
    // 24 standard yards is the reason the format is a 100-mile benchmark.
    expect(leader!.miles).toBeCloseTo(100.01, 1)
  })

  it('breaks a tie on the earlier last lap', () => {
    const early = { ...runner(1, 14), lastLapAt: new Date(START_MS + 13 * HOUR + 30 * 60_000).toISOString() }
    const late = { ...runner(2, 14), lastLapAt: new Date(START_MS + 13 * HOUR + 50 * 60_000).toISOString() }
    const board = standings([late, early], schedule, now)
    expect(board.map(entry => entry.userId)).toEqual([1, 2])
  })
})

describe('resolving the race', () => {
  it('does not finish while two runners are still in', () => {
    const now = START_MS + 14 * HOUR + 60_000
    const outcome = resolveOutcome([runner(1, 14), runner(2, 14)], schedule, now)
    expect(outcome.finished).toBe(false)
    expect(outcome.stillIn).toBe(2)
  })

  it('does not crown the last runner until they complete a yard alone', () => {
    // One runner left, but only level with the runner who just timed out.
    // They still have to go out and finish the next yard by themselves, so
    // this is read DURING yard 15 — both have 14 banked, one made the corral.
    const now = START_MS + 14 * HOUR + 60_000
    const outcome = resolveOutcome(
      [runner(1, 14), runner(2, 14, { status: 'timed_out' })],
      schedule,
      now,
    )
    expect(outcome.finished).toBe(false)
    expect(outcome.winnerId).toBeNull()
  })

  it('crowns the runner who finishes a yard nobody else does', () => {
    const now = START_MS + 15 * HOUR + 60_000
    const outcome = resolveOutcome(
      [runner(1, 15), runner(2, 14, { status: 'timed_out' })],
      schedule,
      now,
    )
    expect(outcome.finished).toBe(true)
    expect(outcome.winnerId).toBe(1)
  })

  it('reports no winner when the last runners time out together', () => {
    const now = START_MS + 15 * HOUR + 60_000
    const outcome = resolveOutcome(
      [runner(1, 14, { status: 'timed_out' }), runner(2, 14, { status: 'timed_out' })],
      schedule,
      now,
    )
    expect(outcome.finished).toBe(true)
    expect(outcome.winnerId).toBeNull()
    expect(outcome.stillIn).toBe(0)
  })

  it('does not finish an empty field before it starts', () => {
    const outcome = resolveOutcome([], schedule, START_MS - HOUR)
    expect(outcome.finished).toBe(false)
  })

  it('holds a capped event open until the leader reaches the cap', () => {
    const capped: BackyardSchedule = { ...schedule, maxYards: 24 }
    const now = START_MS + 16 * HOUR + 60_000
    const short = resolveOutcome(
      [runner(1, 16), runner(2, 15, { status: 'timed_out' })],
      capped,
      now,
    )
    expect(short.finished).toBe(false)

    const reached = resolveOutcome(
      [runner(1, 24), runner(2, 23, { status: 'timed_out' })],
      capped,
      START_MS + 24 * HOUR + 60_000,
    )
    expect(reached.finished).toBe(true)
    expect(reached.winnerId).toBe(1)
  })

  it('respects a winner already recorded', () => {
    const outcome = resolveOutcome([runner(9, 30, { status: 'winner' })], schedule, START_MS)
    expect(outcome.finished).toBe(true)
    expect(outcome.winnerId).toBe(9)
  })
})

describe('formatClock', () => {
  it('drops the hour until there is one', () => {
    expect(formatClock(41 * 60_000 + 8000)).toBe('41:08')
    expect(formatClock(HOUR + 4 * 60_000 + 12_000)).toBe('1:04:12')
  })

  it('never counts below zero', () => {
    expect(formatClock(-5000)).toBe('0:00')
  })
})
