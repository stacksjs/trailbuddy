/**
 * Verification harness for input validation on the hand-written actions
 * (#977): malformed input → 422 with a field-keyed error map, valid input
 * unaffected. Run after `bun scripts/seed-game-world.ts`.
 *
 * Run:  bun scripts/verify-validation.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { boundedNumber, boundedString, durationString, positiveInt } from '../resources/functions/validate'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure validators ----------------------------------------------------

check('positiveInt accepts ids and numeric strings', positiveInt(5) === 5 && positiveInt('12') === 12)
check('positiveInt rejects junk', positiveInt(-1) === null && positiveInt(0) === null
  && positiveInt(1.5) === null && positiveInt('abc') === null && positiveInt(null) === null && positiveInt({}) === null)
check('boundedNumber enforces range', boundedNumber('4.2', 0, 10) === 4.2 && boundedNumber(11, 0, 10) === null
  && boundedNumber(Number.NaN, 0, 10) === null && boundedNumber('', 0, 10) === null)
check('boundedString trims and caps', boundedString('  hi  ', 10) === 'hi'
  && boundedString('', 10) === null && boundedString('x'.repeat(11), 10) === null && boundedString(42, 10) === null)
check('durationString accepts MM:SS and H:MM:SS', durationString('45:30') === '45:30'
  && durationString('1:45:30') === '1:45:30' && durationString('5:09') === '5:09')
check('durationString rejects junk', durationString('banana') === null
  && durationString('90:99') === null && durationString(3600) === null)

// --- Harness bootstrap -------------------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const ClaimAction = (await import('../app/Actions/Territory/ClaimTerritoryAction')).default
const ConquestAction = (await import('../app/Actions/Territory/ProcessActivityConquestAction')).default
const StoreAction = (await import('../app/Actions/Activity/ActivityStoreAction')).default
const KudosAction = (await import('../app/Actions/Activity/KudosToggleAction')).default
const CommentAction = (await import('../app/Actions/Activity/ActivityCommentStoreAction')).default
const FollowAction = (await import('../app/Actions/Social/FollowToggleAction')).default
const ReviewAction = (await import('../app/Actions/Trail/TrailReviewStoreAction')).default
const DecayAction = (await import('../app/Actions/Territory/DecayTerritoriesAction')).default

async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

const fieldsOf = (r: { json: any }) => Object.keys(r.json?.fields ?? {})

// --- Part 2: 422 contract on every custom action -------------------------------------

const claimEmpty = await callAction(ClaimAction, {})
check('claim: empty body → 422 with both fields', claimEmpty.status === 422
  && fieldsOf(claimEmpty).includes('activity_id') && fieldsOf(claimEmpty).includes('user_id'), JSON.stringify(claimEmpty.json))

const claimJunk = await callAction(ClaimAction, { activity_id: 'abc', user_id: 1 })
check('claim: non-numeric activity_id → 422', claimJunk.status === 422 && fieldsOf(claimJunk).includes('activity_id'))

const conquestJunk = await callAction(ConquestAction, { activity_id: -5, user_id: 1 })
check('conquest: negative activity_id → 422', conquestJunk.status === 422 && fieldsOf(conquestJunk).includes('activity_id'))

const storeEmpty = await callAction(StoreAction, { user_id: 1 })
check('store: missing distance + duration → 422 with both fields', storeEmpty.status === 422
  && fieldsOf(storeEmpty).includes('distance') && fieldsOf(storeEmpty).includes('duration'), JSON.stringify(storeEmpty.json?.fields))

const storeJunk = await callAction(StoreAction, {
  user_id: 1,
  activity_type: 'Swim',
  distance: 5000,
  duration: 'banana',
  moving_time: '99',
  trail_id: 'x',
  completed_at: 'not-a-date',
})
const junkFields = fieldsOf(storeJunk)
check('store: junk everywhere → one 422 naming every field', storeJunk.status === 422
  && ['activity_type', 'distance', 'duration', 'moving_time', 'trail_id', 'completed_at'].every(f => junkFields.includes(f)),
junkFields.join(','))

const storeValid = await callAction(StoreAction, {
  user_id: 1,
  activity_type: 'Trail Run',
  distance: 3.1,
  duration: '31:00',
  moving_time: '30:00',
  elevation: 120,
  completed_at: new Date().toISOString(),
})
check('store: valid input still creates (201)', storeValid.status === 201, String(storeValid.status))

const kudosJunk = await callAction(KudosAction, { id: 0, user_id: 1 })
check('kudos: zero id → 422', kudosJunk.status === 422 && fieldsOf(kudosJunk).includes('activity_id'))

const commentJunk = await callAction(CommentAction, { id: storeValid.json.activity.id, user_id: 1, body: '   ' })
check('comment: blank body → 422', commentJunk.status === 422 && fieldsOf(commentJunk).includes('body'))
const commentLong = await callAction(CommentAction, { id: storeValid.json.activity.id, user_id: 1, body: 'x'.repeat(2001) })
check('comment: over-long body → 422', commentLong.status === 422 && fieldsOf(commentLong).includes('body'))

const followJunk = await callAction(FollowAction, { id: 'abc', follower_id: 1 })
check('follow: non-numeric target → 422', followJunk.status === 422 && fieldsOf(followJunk).includes('id'))

const reviewJunk = await callAction(ReviewAction, { id: 1, user_id: 1, rating: 7, content: 'short', conditions: 'lava' })
const reviewFields = fieldsOf(reviewJunk)
check('review: bad rating + content + conditions → one 422 naming all three', reviewJunk.status === 422
  && ['rating', 'content', 'conditions'].every(f => reviewFields.includes(f)), reviewFields.join(','))

const decayJunk = await callAction(DecayAction, { stale_days: 'soon' })
check('decay: non-numeric stale_days → 422', decayJunk.status === 422 && fieldsOf(decayJunk).includes('stale_days'))

console.log(failures === 0 ? '\n✅ all validation checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
