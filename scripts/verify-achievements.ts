/**
 * Verification harness for the achievements unlock engine (#982).
 *
 * Part 1 exercises the pure metric math (streaks, fast splits, progress
 * merge). Part 2 drives the real engine: seeded definitions, event hooks
 * (activity store, kudos), unlock notifications, stickiness (achievements
 * never un-unlock), and idempotent re-evaluation.
 *
 * MUTATES the seeded world — reseed before running other suites.
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-achievements.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { computeAchievementProgress, hasSubSevenMile, longestDayStreak } from '../resources/functions/achievements'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure metric math ----------------------------------------------------

check('streak counts consecutive days', longestDayStreak(['2026-06-01', '2026-06-02', '2026-06-03']) === 3)
check('streak breaks on gaps, keeps best run', longestDayStreak(['2026-06-01', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-09']) === 3)
check('same-day activities count once', longestDayStreak(['2026-06-01T08:00:00Z', '2026-06-01T18:00:00Z', '2026-06-02T09:00:00Z']) === 2)
check('empty/invalid dates → 0 streak', longestDayStreak([]) === 0 && longestDayStreak([null, 'nonsense']) === 0)

check('sub-7 split detected', hasSubSevenMile([JSON.stringify([{ mile: 1, pace: '7:30', elev: 10 }, { mile: 2, pace: '6:45', elev: 5 }])]))
check('exactly 7:00 is not sub-7', !hasSubSevenMile([JSON.stringify([{ mile: 1, pace: '7:00/mi', elev: 0 }])]))
check('malformed splits ignored', !hasSubSevenMile(['not json', null, JSON.stringify({ mile: 1 })]))

const progress = computeAchievementProgress(
  [
    { id: 1, metric: 'activities', target_value: 5 },
    { id: 2, metric: 'total_miles', target_value: 100 },
    { id: 3, metric: 'unknown_metric', target_value: 1 },
  ],
  { activities: 7, total_miles: 42.35 },
)
check('progress merge: complete + incomplete, unknown metric skipped',
  progress.length === 2
  && progress[0]?.is_complete === true && progress[0]?.progress === 7
  && progress[1]?.is_complete === false && progress[1]?.progress === 42.4, // rounded to 1 decimal
  JSON.stringify(progress))

// --- Harness bootstrap -------------------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const StoreAction = (await import('../app/Actions/Activity/ActivityStoreAction')).default
const KudosAction = (await import('../app/Actions/Activity/KudosToggleAction')).default
const EvaluateAction = (await import('../app/Actions/Achievement/EvaluateAchievementsAction')).default
const ListAction = (await import('../app/Actions/Achievement/UserAchievementsAction')).default

async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

const db = new Database('database/stacks.sqlite')
const one = (sql: string, ...args: any[]) => db.query(sql).get(...args) as any

// --- Part 2: seeded definitions + read endpoint -------------------------------------

const list = await callAction(ListAction, { id: 1 })
const badges = list.json?.achievements ?? []
check('read endpoint returns all 10 definitions with progress', list.status === 200 && badges.length === 10)
const firstSteps = badges.find((a: any) => a.name === 'First Steps')
check('First Steps unlocked from seeded activities', firstSteps?.isComplete === true && !!firstSteps?.unlockedAt
  && firstSteps?.progress >= 1, JSON.stringify(firstSteps))
check('meta counts unlocks + points', list.json?.meta?.unlocked >= 1 && list.json?.meta?.totalPoints >= 50,
  JSON.stringify(list.json?.meta))
const lockedBadge = badges.find((a: any) => a.name === 'Century Club')
check('locked badge shows real partial progress', lockedBadge?.isComplete === false && lockedBadge?.progress > 0
  && lockedBadge?.target === 100, JSON.stringify(lockedBadge))

// --- Part 3: event hooks ---------------------------------------------------------------

// A fast run for user 2 → the activity-store hook should unlock Speed Demon.
const notifBefore = one('SELECT COUNT(*) n FROM user_notifications WHERE recipient_id = 2 AND type = \'achievement\'').n
const fastRun = await callAction(StoreAction, {
  user_id: 2,
  activity_type: 'Trail Run',
  distance: 2,
  duration: '13:30',
  moving_time: '13:30',
  splits: [{ mile: 1, pace: '6:50', elev: 20 }, { mile: 2, pace: '6:40', elev: 10 }],
  completed_at: new Date().toISOString(),
})
check('fast activity stored', fastRun.status === 201)
const speedRow = one(`
  SELECT ua.is_complete done, ua.completed_at FROM user_achievements ua
  JOIN achievements a ON a.id = ua.achievement_id
  WHERE ua.user_id = 2 AND a.metric = 'fast_mile'
`)
check('Speed Demon unlocked via store hook', !!speedRow?.done && !!speedRow?.completed_at, JSON.stringify(speedRow))
const notifAfter = one('SELECT COUNT(*) n FROM user_notifications WHERE recipient_id = 2 AND type = \'achievement\'').n
check('unlock notification delivered', notifAfter === notifBefore + 1, `${notifBefore} → ${notifAfter}`)

// Kudos hook: user 3 gives kudos → kudos_given progress moves.
await callAction(KudosAction, { id: fastRun.json.activity.id, user_id: 3 })
const butterflyRow = one(`
  SELECT ua.progress FROM user_achievements ua
  JOIN achievements a ON a.id = ua.achievement_id
  WHERE ua.user_id = 3 AND a.metric = 'kudos_given'
`)
check('kudos hook moves Social Butterfly progress', butterflyRow?.progress === 1, String(butterflyRow?.progress))

// --- Part 4: stickiness + idempotency ----------------------------------------------------

// Force-complete a badge whose metric is 0, then re-evaluate: it must STAY
// unlocked with its original timestamp (achievements never un-unlock).
const defenderId = one('SELECT id FROM achievements WHERE metric = \'territories_defended\'').id
const frozenStamp = '2026-01-01T00:00:00.000Z'
db.query(`
  UPDATE user_achievements SET is_complete = 1, completed_at = ?
  WHERE user_id = 1 AND achievement_id = ?
`).run(frozenStamp, defenderId)
const evalRes = await callAction(EvaluateAction, { user_id: 1 })
check('manual evaluate endpoint works', evalRes.status === 200 && evalRes.json?.evaluated === 10, JSON.stringify(evalRes.json))
const defenderRow = one('SELECT is_complete done, completed_at FROM user_achievements WHERE user_id = 1 AND achievement_id = ?', defenderId)
check('unlocks are sticky (no un-unlock, timestamp preserved)',
  !!defenderRow?.done && defenderRow?.completed_at === frozenStamp, JSON.stringify(defenderRow))

const notifTotalBefore = one('SELECT COUNT(*) n FROM user_notifications WHERE type = \'achievement\'').n
await callAction(EvaluateAction, { user_id: 1 })
await callAction(EvaluateAction, { user_id: 2 })
const notifTotalAfter = one('SELECT COUNT(*) n FROM user_notifications WHERE type = \'achievement\'').n
check('re-evaluation is idempotent (no duplicate unlock notifications)', notifTotalAfter === notifTotalBefore,
  `${notifTotalBefore} → ${notifTotalAfter}`)

const dupRows = one(`
  SELECT MAX(c) m FROM (SELECT COUNT(*) c FROM user_achievements GROUP BY user_id, achievement_id)
`)
check('one progress row per (user, achievement)', dupRows?.m === 1, String(dupRows?.m))

console.log(failures === 0 ? '\n✅ all achievement checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
