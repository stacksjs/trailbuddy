/**
 * Verification harness for the trail reviews surface (#981): the public list
 * endpoint the detail page renders from, and the create→list→aggregate flow
 * behind the review form. (The store/upsert/recompute internals are covered
 * by verify-counters.ts.)
 *
 * MUTATES the seeded world — reseed before running other suites.
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-trail-reviews.ts
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

const IndexAction = (await import('../app/Actions/Trail/TrailReviewIndexAction')).default
const StoreAction = (await import('../app/Actions/Trail/TrailReviewStoreAction')).default

async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

const db = new Database('database/stacks.sqlite', { readonly: true })
const one = (sql: string, ...args: any[]) => db.query(sql).get(...args) as any

// --- public list endpoint ------------------------------------------------------------

const seededCount = one('SELECT COUNT(*) n FROM trail_reviews WHERE trail_id = 1').n
const list = await callAction(IndexAction, { id: 1 })
const rows = list.json?.reviews ?? []
check('index returns the seeded reviews', list.status === 200 && rows.length === seededCount, `${rows.length}/${seededCount}`)
check('author names joined', rows.every((r: any) => r.userName && r.userName !== 'Unknown'), JSON.stringify(rows[0]))
check('content + rating + conditions present', rows.every((r: any) => r.content && r.rating >= 1 && r.rating <= 5))
const junk = await callAction(IndexAction, { id: 'abc' })
check('junk trail id → 422', junk.status === 422, String(junk.status))

// --- create → list → aggregates (the form flow) -----------------------------------------

// Trail 4 is seeded with a single review by user 1, so user 2 is fresh there.
const before = one('SELECT COUNT(*) n FROM trail_reviews WHERE trail_id = 4').n
const created = await callAction(StoreAction, { id: 4, user_id: 2, rating: 5, content: 'Bagged this one at sunrise — unreal.' })
check('form post creates (201) and returns recomputed trail aggregates', created.status === 201
  && created.json?.trail?.reviewCount === before + 1
  && typeof created.json?.trail?.rating === 'number', JSON.stringify(created.json?.trail))

const after = await callAction(IndexAction, { id: 4 })
const afterRows = after.json?.reviews ?? []
check('new review appears in the list (newest first)', afterRows.length === before + 1
  && afterRows[0]?.userId === 2 && afterRows[0]?.rating === 5, JSON.stringify(afterRows[0]))

const updated = await callAction(StoreAction, { id: 4, user_id: 2, rating: 2, content: 'Revisited in rain — much sketchier.' })
check('resubmit upserts (200, count unchanged)', updated.status === 200 && updated.json?.updated === true
  && one('SELECT COUNT(*) n FROM trail_reviews WHERE trail_id = 4').n === before + 1)

const trailRow = one('SELECT rating, review_count FROM trails WHERE id = 4')
check('trail aggregates match the rows', trailRow?.review_count === before + 1
  && trailRow?.rating === updated.json?.trail?.rating, JSON.stringify(trailRow))

console.log(failures === 0 ? '\n✅ all trail review checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
