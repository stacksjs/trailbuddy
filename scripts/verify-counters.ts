/**
 * Verification harness for the data-integrity pair: #972 unique constraints
 * and #973 denormalized counter recompute.
 *
 * Asserts the composite unique indexes exist and reject duplicates, the
 * kudos/follow toggles stay idempotent through them, the trail-review store
 * upserts (one review per user per trail) and keeps trail rating/review_count
 * honest, and the full drift-repair sweep fixes manually corrupted counters.
 *
 * MUTATES the seeded world - reseed before running other suites.
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-counters.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { computeCounterFixes } from '../resources/functions/counters'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure counter math --------------------------------------------------

const fixes = computeCounterFixes({
  activities: [{ id: 1, kudos_count: 5 }, { id: 2, kudos_count: 1 }],
  kudos: [{ activity_id: 1 }, { activity_id: 1 }, { activity_id: 3 }],
  trails: [{ id: 1, rating: 4.8, review_count: 120 }, { id: 2, rating: 4, review_count: 2 }],
  reviews: [{ trail_id: 1, rating: 5 }, { trail_id: 1, rating: 4 }, { trail_id: 2, rating: 5 }, { trail_id: 2, rating: 3 }],
})
check('kudos drift detected', fixes.activityFixes.length === 2
  && fixes.activityFixes[0]?.kudos_count === 2 && fixes.activityFixes[1]?.kudos_count === 0, JSON.stringify(fixes.activityFixes))
check('trail drift detected with 1-decimal avg', fixes.trailFixes.length === 1
  && fixes.trailFixes[0]?.id === 1 && fixes.trailFixes[0]?.rating === 4.5 && fixes.trailFixes[0]?.review_count === 2, JSON.stringify(fixes.trailFixes))

// --- Harness bootstrap ----------------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const KudosAction = (await import('../app/Actions/Activity/KudosToggleAction')).default
const FollowAction = (await import('../app/Actions/Social/FollowToggleAction')).default
const ReviewAction = (await import('../app/Actions/Trail/TrailReviewStoreAction')).default
const RecomputeAction = (await import('../app/Actions/Maintenance/RecomputeCountersAction')).default

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

// --- Part 2: unique indexes exist and bite ---------------------------------------

const EXPECTED_INDEXES = [
  ['kudos', 'kudos_kudos_giver_activity_unique'],
  ['saved_trails', 'saved_trails_saved_trails_user_trail_unique'],
  ['follows', 'follows_follows_follower_following_unique'],
  ['user_achievements', 'user_achievements_user_achievements_user_achievement_unique'],
  ['trail_reviews', 'trail_reviews_trail_reviews_user_trail_unique'],
  ['territory_stats', 'territory_stats_territory_stats_user_unique'],
]
const liveIndexes = new Set(
  (db.query('SELECT name FROM sqlite_master WHERE type = \'index\'').all() as any[]).map(r => r.name),
)
check('all six unique indexes exist', EXPECTED_INDEXES.every(([, name]) => liveIndexes.has(name)),
  EXPECTED_INDEXES.filter(([, n]) => !liveIndexes.has(n)).map(([t]) => t).join(',') || 'all present')

const anyActivity = one('SELECT id, user_id FROM activities LIMIT 1')
db.query('INSERT INTO kudos (giver_id, user_id, activity_id) VALUES (?, ?, ?)').run(2, anyActivity.user_id, anyActivity.id)
let dupRejected = false
try {
  db.query('INSERT INTO kudos (giver_id, user_id, activity_id) VALUES (?, ?, ?)').run(2, anyActivity.user_id, anyActivity.id)
}
catch (err) {
  dupRejected = String(err).includes('UNIQUE')
}
check('duplicate kudos rejected at the database', dupRejected)
db.query('DELETE FROM kudos WHERE giver_id = 2 AND activity_id = ?').run(anyActivity.id)

// --- Part 3: toggles stay idempotent through the indexes --------------------------

const youActivity = one('SELECT id FROM activities WHERE user_id = 1 LIMIT 1')
const kOn = await callAction(KudosAction, { id: youActivity.id, user_id: 2 })
const kOff = await callAction(KudosAction, { id: youActivity.id, user_id: 2 })
check('kudos toggle on→off', kOn.json?.kudosed === true && kOn.json?.kudosCount === 1
  && kOff.json?.kudosed === false && kOff.json?.kudosCount === 0,
`${kOn.json?.kudosed}/${kOn.json?.kudosCount} then ${kOff.json?.kudosed}/${kOff.json?.kudosCount}`)
check('kudos_count column synced after toggles', one('SELECT kudos_count n FROM activities WHERE id = ?', youActivity.id).n === 0)

const fOn = await callAction(FollowAction, { id: 3, follower_id: 2 })
const fOff = await callAction(FollowAction, { id: 3, follower_id: 2 })
check('follow toggle on→off', fOn.json?.following === true && fOff.json?.following === false,
  `${fOn.json?.following} then ${fOff.json?.following}`)
check('no duplicate follow rows', one('SELECT COUNT(*) n FROM follows WHERE follower_id = 2 AND following_id = 3').n === 0)

// --- Part 4: review upsert + per-trail counter hook --------------------------------

const trail = one('SELECT id FROM trails ORDER BY id LIMIT 1')
const before = one('SELECT COUNT(*) n, COALESCE(SUM(rating), 0) s FROM trail_reviews WHERE trail_id = ?', trail.id)
const hasUser2Review = one('SELECT COUNT(*) n FROM trail_reviews WHERE trail_id = ? AND user_id = 2', trail.id).n > 0
check('test precondition: user 2 has not reviewed the first trail', !hasUser2Review)

const r1 = await callAction(ReviewAction, { id: trail.id, user_id: 2, rating: 5, content: 'Strong climbs, stronger coffee after.' })
const expAvg1 = Math.round((before.s + 5) / (before.n + 1) * 10) / 10
check('review created (201) and trail counters recomputed', r1.status === 201 && r1.json?.updated === false
  && r1.json?.trail?.reviewCount === before.n + 1 && r1.json?.trail?.rating === expAvg1, JSON.stringify(r1.json?.trail))

const r2 = await callAction(ReviewAction, { id: trail.id, user_id: 2, rating: 1, content: 'Revised: trail was closed halfway up.' })
const expAvg2 = Math.round((before.s + 1) / (before.n + 1) * 10) / 10
check('second submit upserts (200, no duplicate)', r2.status === 200 && r2.json?.updated === true
  && one('SELECT COUNT(*) n FROM trail_reviews WHERE trail_id = ? AND user_id = 2', trail.id).n === 1)
check('trail rating tracks the edited review', r2.json?.trail?.rating === expAvg2
  && one('SELECT rating r, review_count c FROM trails WHERE id = ?', trail.id).r === expAvg2)

const badRating = await callAction(ReviewAction, { id: trail.id, user_id: 2, rating: 0, content: 'rating too low to be valid' })
const badContent = await callAction(ReviewAction, { id: trail.id, user_id: 2, rating: 4, content: 'short' })
const badTrail = await callAction(ReviewAction, { id: 999999, user_id: 2, rating: 4, content: 'no such trail around here' })
check('review validation (rating/content/trail)', badRating.status === 422 && badContent.status === 422 && badTrail.status === 404,
  `${badRating.status}/${badContent.status}/${badTrail.status}`)

// --- Part 5: full drift repair ------------------------------------------------------

db.query('UPDATE trails SET rating = 4.9, review_count = 999 WHERE id = ?').run(trail.id)
db.query('UPDATE activities SET kudos_count = 42 WHERE id = ?').run(youActivity.id)

const sweep = await callAction(RecomputeAction, {})
check('sweep reports fixes', sweep.status === 200 && sweep.json?.success === true
  && sweep.json?.trailsFixed >= 1 && sweep.json?.activitiesFixed >= 1, JSON.stringify(sweep.json))

const trailAfter = one('SELECT rating r, review_count c FROM trails WHERE id = ?', trail.id)
check('trail drift repaired from review rows', trailAfter.r === expAvg2 && trailAfter.c === before.n + 1, JSON.stringify(trailAfter))
check('activity drift repaired from kudos rows', one('SELECT kudos_count n FROM activities WHERE id = ?', youActivity.id).n === 0)

const sweepAgain = await callAction(RecomputeAction, {})
check('sweep idempotent (second run fixes nothing)', sweepAgain.json?.trailsFixed === 0 && sweepAgain.json?.activitiesFixed === 0,
  JSON.stringify(sweepAgain.json))

console.log(failures === 0 ? '\n✅ all integrity checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
