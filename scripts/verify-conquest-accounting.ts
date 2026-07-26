/**
 * Verification harness for ProcessActivityConquestAction accounting (#951).
 *
 * Run AFTER `bun scripts/seed-game-world.ts` (which performs a real split
 * conquest). Asserts:
 *   1. Re-POSTing the processed conquest activity is a no-op (idempotency).
 *   2. Conquering with someone else's activity is rejected (403).
 *
 * Run:  bun scripts/verify-conquest-accounting.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()

const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const ProcessConquest = (await import('../app/Actions/Territory/ProcessActivityConquestAction')).default

async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures++
}

// Find the activity that already produced the seeded conquest.
const db = new Database('database/stacks.sqlite', { readonly: true })
const conquestRow = db.query(
  `SELECT activity_id, user_id FROM territory_histories WHERE event_type = 'conquered' LIMIT 1`,
).get() as any
const before = db.query(
  `SELECT (SELECT COUNT(*) FROM territories) t, (SELECT COUNT(*) FROM territory_histories) h,
          (SELECT ROUND(SUM(total_area_owned)) FROM territory_stats) a`,
).get() as any
db.close()

if (!conquestRow) {
  console.error('No seeded conquest found - run scripts/seed-game-world.ts first.')
  process.exit(1)
}

// 1. Idempotency: same activity re-POSTed → no-op.
const replay = await callAction(ProcessConquest, {
  activity_id: conquestRow.activity_id,
  user_id: conquestRow.user_id,
})
check('replay returns success', replay.status === 200 && replay.json?.success === true)
check('replay flagged alreadyProcessed', replay.json?.alreadyProcessed === true)
check('replay conquered nothing', (replay.json?.conqueredCount ?? -1) === 0)

const db2 = new Database('database/stacks.sqlite', { readonly: true })
const after = db2.query(
  `SELECT (SELECT COUNT(*) FROM territories) t, (SELECT COUNT(*) FROM territory_histories) h,
          (SELECT ROUND(SUM(total_area_owned)) FROM territory_stats) a`,
).get() as any
db2.close()
check('territory count unchanged', before.t === after.t, `${before.t} → ${after.t}`)
check('history count unchanged', before.h === after.h, `${before.h} → ${after.h}`)
check('total owned area unchanged', before.a === after.a, `${before.a} → ${after.a}`)

// 2. Ownership guard: another user cannot conquer with this activity.
const otherUser = conquestRow.user_id + 1
const theft = await callAction(ProcessConquest, {
  activity_id: conquestRow.activity_id,
  user_id: otherUser,
})
check('foreign activity rejected with 403', theft.status === 403, `status ${theft.status}`)

console.log(failures === 0 ? '\n✅ conquest accounting checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
