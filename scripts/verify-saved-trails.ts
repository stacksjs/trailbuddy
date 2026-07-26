/**
 * Verification harness for saved trails (#969): toggle on/off through the
 * real action, FK persistence (the SavedTrail model previously had camelCase
 * attrs + no FK attrs - rows would have been NULL-keyed), dedup via the #972
 * unique index, and the joined index endpoint the profile tab renders from.
 *
 * MUTATES the seeded world - reseed before running other suites.
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-saved-trails.ts
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
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures++
}

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const ToggleAction = (await import('../app/Actions/Trail/SavedTrailToggleAction')).default
const IndexAction = (await import('../app/Actions/Trail/SavedTrailIndexAction')).default

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

// --- seeded state + index endpoint -------------------------------------------------

const seeded = await callAction(IndexAction, { id: 1 })
const list = seeded.json?.savedTrails ?? []
check('index returns the 3 seeded bookmarks', seeded.status === 200 && list.length === 3, String(list.length))
check('trail summaries joined in', list.every((s: any) => s.trail?.name && s.trail?.id === s.trailId),
  JSON.stringify(list[0]?.trail ?? null))
check('want/has flags roundtrip (snake_case fix)', list.some((s: any) => s.hasVisited === true)
  && list.some((s: any) => s.wantToVisit === true), JSON.stringify(list.map((s: any) => [s.trailId, s.wantToVisit, s.hasVisited])))

// --- toggle on/off -------------------------------------------------------------------

const on = await callAction(ToggleAction, { id: 5, user_id: 2 })
check('toggle on → saved true', on.status === 200 && on.json?.saved === true, JSON.stringify(on.json))
const row = one('SELECT user_id, trail_id, want_to_visit FROM saved_trails WHERE user_id = 2 AND trail_id = 5')
check('row persisted with real FKs', row?.user_id === 2 && row?.trail_id === 5 && row?.want_to_visit === 1, JSON.stringify(row))

const off = await callAction(ToggleAction, { id: 5, user_id: 2 })
check('toggle off → saved false, row gone', off.json?.saved === false
  && one('SELECT COUNT(*) n FROM saved_trails WHERE user_id = 2 AND trail_id = 5').n === 0)

// --- dedup at the database -----------------------------------------------------------

let dupRejected = false
try {
  db.query('INSERT INTO saved_trails (user_id, trail_id, want_to_visit, has_visited) VALUES (1, 1, 1, 0)').run()
}
catch (err) {
  dupRejected = String(err).includes('UNIQUE')
}
check('duplicate bookmark rejected by the unique index', dupRejected)

// --- validation + edges ---------------------------------------------------------------

const junk = await callAction(ToggleAction, { id: 'abc', user_id: 2 })
check('junk trail id → 422', junk.status === 422 && !!junk.json?.fields?.trail_id, String(junk.status))
const ghost = await callAction(ToggleAction, { id: 999999, user_id: 2 })
check('unknown trail → 404', ghost.status === 404, String(ghost.status))
const noAuth = await callAction(ToggleAction, { id: 5 })
check('no user → 401', noAuth.status === 401, String(noAuth.status))
const emptyList = await callAction(IndexAction, { id: 3 })
check('user with no bookmarks → empty success', emptyList.status === 200 && emptyList.json?.savedTrails?.length === 0)
const junkIndex = await callAction(IndexAction, { id: -1 })
check('junk user id on index → 422', junkIndex.status === 422, String(junkIndex.status))

console.log(failures === 0 ? '\n✅ all saved-trail checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
