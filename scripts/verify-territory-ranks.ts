/**
 * Verification harness for territory rank recompute (#944).
 *
 * Run AFTER `bun scripts/seed-game-world.ts`. The seeded world produces
 * DIFFERENT weekly vs all-time orders, which proves the two metrics:
 *   - all-time (current holdings): You 94,977 > Rival 86,081 > Explorer 44,191
 *   - weekly (area gained, 7d):    Rival 112,011 (two claims) > You 94,978
 *                                  (claim + conquest) > Explorer 44,191
 *
 * Run:  bun scripts/verify-territory-ranks.ts
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

const ComputeRanks = (await import('../app/Actions/Territory/ComputeTerritoryRanksAction')).default

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

function rows(): any[] {
  const db = new Database('database/stacks.sqlite', { readonly: true })
  const r = db.query('SELECT user_id, weekly_rank, all_time_rank, ROUND(total_area_owned) area FROM territory_stats ORDER BY user_id').all()
  db.close()
  return r as any[]
}

// 1. Claims/conquests during seeding already triggered the recompute — the
//    hardcoded-999 era is over and every row carries a real rank.
const seeded = rows()
console.log(`stats: ${seeded.map(r => `u${r.user_id}(area ${r.area}, wk #${r.weekly_rank}, all #${r.all_time_rank})`).join('  ')}\n`)
check('no 999 sentinel ranks', seeded.every(r => r.weekly_rank !== 999 && r.all_time_rank !== 999))
check('every row is ranked', seeded.every(r => r.weekly_rank >= 1 && r.all_time_rank >= 1))

const byUser = new Map(seeded.map(r => [r.user_id, r]))
check('all-time order: You > Rival > Explorer',
  byUser.get(1)?.all_time_rank === 1 && byUser.get(2)?.all_time_rank === 2 && byUser.get(3)?.all_time_rank === 3,
  seeded.map(r => `u${r.user_id}:#${r.all_time_rank}`).join(' '))
check('weekly order: Rival > You > Explorer (gains, not holdings)',
  byUser.get(2)?.weekly_rank === 1 && byUser.get(1)?.weekly_rank === 2 && byUser.get(3)?.weekly_rank === 3,
  seeded.map(r => `u${r.user_id}:#${r.weekly_rank}`).join(' '))

// 2. On-demand recompute is idempotent when nothing changed.
const request = { get: (_k: string) => undefined }
const res = await ComputeRanks.handle(request)
const json = await res.clone().json()
check('on-demand action succeeds', json?.success === true)
check('stable ranks → 0 rows rewritten', json?.updated === 0, `updated=${json?.updated}`)
check('action returns ranked summary', Array.isArray(json?.ranks) && json.ranks[0]?.allTimeRank === 1)

console.log(failures === 0 ? '\n✅ all rank checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
