/**
 * Verification harness for list-endpoint pagination metadata (#978):
 * offset/limit params + meta { offset, limit, total, hasMore } on the index
 * endpoints, with correct slicing, total (full match count), and clamping.
 *
 * Run after `bun scripts/seed-game-world.ts`.
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { paginate, readPageParams } from '../resources/functions/pagination'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure helper ---------------------------------------------------------

const rows = Array.from({ length: 17 }, (_, i) => i)
const p1 = paginate(rows, { offset: 0, limit: 5 })
check('paginate slices the page', p1.items.length === 5 && p1.items[0] === 0)
check('meta has offset/limit/total/hasMore', p1.meta.offset === 0 && p1.meta.limit === 5 && p1.meta.total === 17 && p1.meta.hasMore === true)
const p2 = paginate(rows, { offset: 15, limit: 5 })
check('last page: partial items, hasMore false', p2.items.length === 2 && p2.meta.hasMore === false)
const p3 = paginate(rows, { offset: 0, limit: 100 })
check('limit ≥ total: all items, hasMore false', p3.items.length === 17 && p3.meta.hasMore === false)

const req = (q: Record<string, any>) => ({ get: (k: string) => q[k] })
check('readPageParams defaults', JSON.stringify(readPageParams(req({}))) === JSON.stringify({ offset: 0, limit: 50 }))
check('readPageParams clamps limit to max', readPageParams(req({ limit: 9999 }), { maxLimit: 200 }).limit === 200)
check('readPageParams rejects junk/negative', readPageParams(req({ limit: 'x', offset: -3 })).offset === 0
  && readPageParams(req({ limit: 'x' })).limit === 50)

// --- Part 2: live endpoints ------------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const ActivityIndex = (await import('../app/Actions/Activity/ActivityIndexAction')).default
const TrailIndex = (await import('../app/Actions/Trail/TrailIndexAction')).default
const ClubIndex = (await import('../app/Actions/Club/ClubIndexAction')).default
const UserSearch = (await import('../app/Actions/Social/UserSearchAction')).default

async function call(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status: res?.status ?? 200, json }
}

// Activities: full set first to learn the real total.
const aAll = await call(ActivityIndex, {})
const total = aAll.json?.meta?.total
check('ActivityIndex returns full meta', typeof total === 'number'
  && aAll.json?.meta?.offset === 0 && typeof aAll.json?.meta?.limit === 'number'
  && typeof aAll.json?.meta?.hasMore === 'boolean', JSON.stringify(aAll.json?.meta))
check('default page returns all when total < limit', aAll.json?.activities?.length === total && aAll.json?.meta?.hasMore === false)

const aPage = await call(ActivityIndex, { limit: 5, offset: 0 })
check('limit=5 → 5 items, hasMore true, total unchanged', aPage.json?.activities?.length === Math.min(5, total)
  && aPage.json?.meta?.total === total && aPage.json?.meta?.hasMore === (total > 5), JSON.stringify(aPage.json?.meta))
const aPage2 = await call(ActivityIndex, { limit: 5, offset: 5 })
check('offset=5 returns a different slice', aPage.json?.activities?.[0]?.id !== aPage2.json?.activities?.[0]?.id || total <= 5)
const aLast = await call(ActivityIndex, { limit: 5, offset: total - 2 })
check('last partial page has hasMore false', aLast.json?.activities?.length === 2 && aLast.json?.meta?.hasMore === false)

// Trails: was a bare array; now wrapped with meta (backward-compatible reader).
const tAll = await call(TrailIndex, {})
check('TrailIndex now wrapped { trails, meta }', Array.isArray(tAll.json?.trails) && !!tAll.json?.meta
  && typeof tAll.json.meta.total === 'number', JSON.stringify(tAll.json?.meta))
const tPage = await call(TrailIndex, { limit: 5 })
check('TrailIndex paginates', tPage.json?.trails?.length === Math.min(5, tAll.json.meta.total)
  && tPage.json?.meta?.hasMore === (tAll.json.meta.total > 5))

// Clubs (anonymous): meta present.
const cAll = await call(ClubIndex, {})
check('ClubIndex has pagination meta', typeof cAll.json?.meta?.offset === 'number'
  && typeof cAll.json?.meta?.hasMore === 'boolean')

// UserSearch: total must be the REAL match count, not capped at the page size
// (the DB-side .limit() before paginate() was removed, #978 review).
const sAll = await call(UserSearch, {})
const userTotal = sAll.json?.meta?.total
check('UserSearch total = real match count', typeof userTotal === 'number' && userTotal >= 3
  && sAll.json?.athletes?.length === userTotal, JSON.stringify(sAll.json?.meta))
const sPage = await call(UserSearch, { limit: 2 })
check('UserSearch limit=2: 2 items, total unchanged, hasMore true (not capped)',
  sPage.json?.athletes?.length === 2 && sPage.json?.meta?.total === userTotal
  && sPage.json?.meta?.hasMore === (userTotal > 2), JSON.stringify(sPage.json?.meta))

console.log(failures === 0 ? '\n✅ all pagination checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
