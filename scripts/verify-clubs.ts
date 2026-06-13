/**
 * Verification harness for clubs (#964): index with derived member counts +
 * weekly stats and private-club visibility, create-with-auto-owner, join/leave
 * toggle (incl. owner-can't-leave + db dedup), and the detail endpoint.
 *
 * MUTATES the seeded world — reseed before running other suites.
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-clubs.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const IndexAction = (await import('../app/Actions/Club/ClubIndexAction')).default
const StoreAction = (await import('../app/Actions/Club/ClubStoreAction')).default
const ToggleAction = (await import('../app/Actions/Club/ClubMembershipToggleAction')).default
const ShowAction = (await import('../app/Actions/Club/ClubShowAction')).default

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

// --- index + private visibility -------------------------------------------------

// Anonymous (no user_id) — private clubs must be hidden.
const anon = await callAction(IndexAction, {})
const anonNames = (anon.json?.clubs ?? []).map((c: any) => c.name)
check('index returns public clubs to anonymous', anon.status === 200 && anonNames.includes('Trail Crushers'))
check('private club hidden from anonymous', !anonNames.includes('Conqueror\'s Guild'), anonNames.join(','))
const crushers = (anon.json?.clubs ?? []).find((c: any) => c.name === 'Trail Crushers')
check('derived memberCount + weekly stats present', crushers?.memberCount === 3
  && typeof crushers?.weeklyDistance === 'number' && typeof crushers?.activitiesThisWeek === 'number', JSON.stringify(crushers))

// Member of the private club (user 3) sees it.
const asMember = await callAction(IndexAction, { user_id: 3 })
check('private club visible to its member', (asMember.json?.clubs ?? []).some((c: any) => c.name === 'Conqueror\'s Guild'))
const crushersMember = (asMember.json?.clubs ?? []).find((c: any) => c.name === 'Trail Crushers')
check('isMember reflects session user', crushersMember?.isMember === true)

// --- create with auto-owner ------------------------------------------------------

const created = await callAction(StoreAction, { user_id: 2, name: 'Dawn Patrol', club_type: 'Running', description: 'Sunrise miles.', location: 'Boulder, CO' })
const newClubId = created.json?.club?.id
check('create returns 201 with creator auto-enrolled as sole member', created.status === 201
  && created.json?.club?.memberCount === 1 && created.json?.club?.isMember === true, JSON.stringify(created.json?.club))
check('owner membership row written', one('SELECT role FROM club_members WHERE club_id = ? AND user_id = 2', newClubId)?.role === 'owner')

const badCreate = await callAction(StoreAction, { user_id: 2, name: 'x', club_type: 'Swimming' })
check('create validation (short name + bad type) → 422', badCreate.status === 422
  && !!badCreate.json?.fields?.name && !!badCreate.json?.fields?.club_type)
const noAuthCreate = await callAction(StoreAction, { name: 'Ghost Club', club_type: 'Running' })
check('create without auth → 401', noAuthCreate.status === 401)

// --- join / leave ---------------------------------------------------------------

// User 3 is NOT in Weekend Warriors (club 2) — join then leave.
const club2 = one('SELECT id FROM clubs WHERE name = \'Weekend Warriors\'').id
const before = one('SELECT COUNT(*) n FROM club_members WHERE club_id = ?', club2).n
const join = await callAction(ToggleAction, { id: club2, user_id: 3 })
check('join → joined true, memberCount +1', join.json?.joined === true && join.json?.memberCount === before + 1, JSON.stringify(join.json))
const leave = await callAction(ToggleAction, { id: club2, user_id: 3 })
check('leave → joined false, memberCount back', leave.json?.joined === false && leave.json?.memberCount === before)

// Owner of club 2 (user 2) can't leave.
const ownerLeave = await callAction(ToggleAction, { id: club2, user_id: 2 })
check('owner cannot leave their own club → 400', ownerLeave.status === 400, JSON.stringify(ownerLeave.json))

// DB-level dedup.
let dupRejected = false
try { db.query('INSERT INTO club_members (club_id, user_id, role) VALUES (?, 1, \'member\')').run(club2); db.query('INSERT INTO club_members (club_id, user_id, role) VALUES (?, 1, \'member\')').run(club2) }
catch (err) { dupRejected = String(err).includes('UNIQUE') }
check('duplicate membership rejected by unique index', dupRejected)
db.query('DELETE FROM club_members WHERE club_id = ? AND user_id = 1', [club2]).run?.() ?? db.query('DELETE FROM club_members WHERE club_id = ? AND user_id = 1').run(club2)

const junkJoin = await callAction(ToggleAction, { id: 'abc', user_id: 3 })
check('junk club id → 422', junkJoin.status === 422)
const ghostJoin = await callAction(ToggleAction, { id: 999999, user_id: 3 })
check('unknown club → 404', ghostJoin.status === 404)

// --- detail ---------------------------------------------------------------------

const detail = await callAction(ShowAction, { id: club2 })
check('show returns members + feed + leaderboard', detail.status === 200
  && Array.isArray(detail.json?.club?.members) && detail.json.club.members.length >= 1
  && Array.isArray(detail.json?.club?.recentFeed)
  && Array.isArray(detail.json?.club?.leaderboard), JSON.stringify(Object.keys(detail.json?.club ?? {})))
check('leaderboard is ranked', (detail.json?.club?.leaderboard ?? []).every((r: any, i: number) => r.rank === i + 1))

const privateClub = one('SELECT id FROM clubs WHERE name = \'Conqueror\'\'s Guild\'').id
const privNonMember = await callAction(ShowAction, { id: privateClub, user_id: 2 })
check('private club detail → 403 for non-member', privNonMember.status === 403, String(privNonMember.status))
const privMember = await callAction(ShowAction, { id: privateClub, user_id: 1 })
check('private club detail → 200 for member', privMember.status === 200)

console.log(failures === 0 ? '\n✅ all club checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
