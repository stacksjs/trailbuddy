/**
 * Verification harness for challenges (#965): index (the user's sent+received
 * with names joined), create-over-a-rival's-territory (derived opponent +
 * stake, self-challenge + duplicate guards), accept/decline by the defender
 * only, and resolve-by-ownership.
 *
 * MUTATES the seeded world — reseed before running other suites.
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-challenges.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { shapeChallenge } from '../resources/functions/challenges'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure shaper ---------------------------------------------------------

const shaped = shapeChallenge(
  { id: 9, challenger_id: 1, challenged_id: 2, territory_id: 3, area_at_stake: 50000, status: 'pending', winner_id: null, deadline: 'd', created_at: 'c' },
  { challengerName: 'You', challengedName: 'Rival', territoryName: 'Desert Crown' },
)
check('shapeChallenge maps snake → camel', shaped.challengerName === 'You' && shaped.challengedName === 'Rival'
  && shaped.territoryName === 'Desert Crown' && shaped.areaAtStake === 50000 && shaped.winnerId === null)

// --- Harness bootstrap ------------------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const IndexAction = (await import('../app/Actions/Challenge/ChallengeIndexAction')).default
const StoreAction = (await import('../app/Actions/Challenge/ChallengeStoreAction')).default
const RespondAction = (await import('../app/Actions/Challenge/ChallengeRespondAction')).default
const ResolveAction = (await import('../app/Actions/Challenge/ChallengeResolveAction')).default

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

// Territories: one owned by user 1 (can't challenge), one owned by someone else.
const ownTerr = one('SELECT id FROM territories WHERE user_id = 1 LIMIT 1')?.id
const rivalTerr = one('SELECT id, user_id FROM territories WHERE user_id != 1 LIMIT 1')

// --- index ----------------------------------------------------------------------

const idx = await callAction(IndexAction, { user_id: 1 })
const mine = idx.json?.challenges ?? []
check('index returns the user\'s challenges with names joined', idx.status === 200 && mine.length >= 1
  && mine.every((c: any) => (c.challengerId === 1 || c.challengedId === 1) && c.challengerName && c.territoryName), JSON.stringify(mine[0]))
const noAuthIdx = await callAction(IndexAction, {})
check('index without auth → 401', noAuthIdx.status === 401)

// Clean slate for the create/respond/resolve flow so seeded challenges don't
// collide with the one-open-challenge-per-territory guard.
db.query('DELETE FROM challenges').run()

// --- create ---------------------------------------------------------------------

const notifBefore = one('SELECT COUNT(*) n FROM user_notifications WHERE recipient_id = ? AND type = \'challenge\'', rivalTerr.user_id).n
const created = await callAction(StoreAction, { user_id: 1, territory_id: rivalTerr.id })
check('create derives opponent + stake from territory', created.status === 201
  && created.json?.challenge?.challengedId === rivalTerr.user_id
  && created.json?.challenge?.areaAtStake > 0
  && created.json?.challenge?.status === 'pending', JSON.stringify(created.json?.challenge))
const newId = created.json?.challenge?.id

const dup = await callAction(StoreAction, { user_id: 1, territory_id: rivalTerr.id })
check('duplicate open challenge → 409', dup.status === 409, String(dup.status))
const ownChallenge = await callAction(StoreAction, { user_id: 1, territory_id: ownTerr })
check('challenging your own territory → 400', ownChallenge.status === 400, String(ownChallenge.status))
const ghostTerr = await callAction(StoreAction, { user_id: 1, territory_id: 999999 })
check('unknown territory → 404', ghostTerr.status === 404)
const junkTerr = await callAction(StoreAction, { user_id: 1, territory_id: 'x' })
check('junk territory id → 422', junkTerr.status === 422)
const noAuthStore = await callAction(StoreAction, { territory_id: rivalTerr.id })
check('create without auth → 401', noAuthStore.status === 401)

// notification to the defender was written
check('defender notified on create', one('SELECT COUNT(*) n FROM user_notifications WHERE recipient_id = ? AND type = \'challenge\'', rivalTerr.user_id).n === notifBefore + 1)

// --- respond (accept/decline) ----------------------------------------------------

// The new challenge: challenger=1, challenged=rivalTerr.user_id, pending.
const defender = rivalTerr.user_id
const wrongResponder = await callAction(RespondAction, { id: newId, user_id: 1, action: 'accept' })
check('non-defender can\'t respond → 403', wrongResponder.status === 403)
const badAction = await callAction(RespondAction, { id: newId, user_id: defender, action: 'maybe' })
check('invalid action → 422', badAction.status === 422)
const accepted = await callAction(RespondAction, { id: newId, user_id: defender, action: 'accept' })
check('defender accepts → active', accepted.status === 200 && accepted.json?.challenge?.status === 'active', JSON.stringify(accepted.json?.challenge?.status))
const reRespond = await callAction(RespondAction, { id: newId, user_id: defender, action: 'decline' })
check('responding again → 409 (not pending)', reRespond.status === 409)

// A second challenge to decline: need a fresh pending one. Use a different rival territory if available, else decline-path via a new challenge on another territory.
const otherRival = one('SELECT id, user_id FROM territories WHERE user_id != 1 AND id != ? LIMIT 1', rivalTerr.id)
if (otherRival) {
  const c2 = await callAction(StoreAction, { user_id: 1, territory_id: otherRival.id })
  const declined = await callAction(RespondAction, { id: c2.json?.challenge?.id, user_id: otherRival.user_id, action: 'decline' })
  check('defender declines → declined', declined.status === 200 && declined.json?.challenge?.status === 'declined')
}
else {
  check('defender declines → declined (skipped: no second rival territory)', true)
}

// --- resolve --------------------------------------------------------------------

// newId is active (accepted above). It can't be resolved before its deadline.
const earlyResolve = await callAction(ResolveAction, { id: newId, user_id: 1 })
check('can\'t resolve before the deadline → 409', earlyResolve.status === 409, String(earlyResolve.status))
db.query('UPDATE challenges SET deadline = ? WHERE id = ?').run(new Date(Date.now() - 86400000).toISOString(), newId)

const nonParticipant = [1, 2, 3].find(u => u !== 1 && u !== defender) ?? 99
const outsider = await callAction(ResolveAction, { id: newId, user_id: nonParticipant })
check('non-participant can\'t resolve → 403', outsider.status === 403, String(outsider.status))

// Split-conquest winner (review #965): the challenger took a CHILD piece of the
// staked territory, not the original row. Clone the staked territory as a child
// owned by the challenger (user 1) and confirm resolve credits the challenger.
const stake = one('SELECT * FROM territories WHERE id = ?', rivalTerr.id)
const cloneCols = Object.keys(stake).filter(k => k !== 'id')
const cloneVals = cloneCols.map((c) => {
  if (c === 'user_id') return 1
  if (c === 'parent_territory_id') return rivalTerr.id
  if (c === 'uuid') return `child-${rivalTerr.id}-stk`
  return (stake as any)[c]
})
db.query(`INSERT INTO territories (${cloneCols.map(c => `"${c}"`).join(',')}) VALUES (${cloneCols.map(() => '?').join(',')})`).run(...cloneVals)

const resolved = await callAction(ResolveAction, { id: newId, user_id: 1 })
check('resolve credits the challenger for a split-off child territory', resolved.status === 200
  && resolved.json?.challenge?.status === 'completed'
  && resolved.json?.challenge?.winnerId === 1, JSON.stringify(resolved.json?.challenge))
const reResolve = await callAction(ResolveAction, { id: newId, user_id: 1 })
check('resolving a completed challenge → 409', reResolve.status === 409)

console.log(failures === 0 ? '\n✅ all challenge checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
