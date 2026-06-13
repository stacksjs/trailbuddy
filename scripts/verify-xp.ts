/**
 * Verification harness for persisted XP (#947): XP awarded server-side on
 * claim/conquest, returned in the response, accumulated into territory_stats.xp
 * (idempotent under replay), and exposed via the leaderboard + athlete profile.
 *
 * MUTATES the seeded world — reseed before running other suites.
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-xp.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { XP_REWARDS } from '../resources/functions/xp'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure rewards --------------------------------------------------------

check('claim XP scales with area', XP_REWARDS.claim(0) === 100 && XP_REWARDS.claim(25000) === 125)
check('conquest XP scales with area gained', XP_REWARDS.conquest(0) === 150 && XP_REWARDS.conquest(50000) === 200)
check('defend XP is flat', XP_REWARDS.defend() === 75)

// --- Harness bootstrap -----------------------------------------------------------

function loopGeoJson(centerLat: number, centerLng: number, radiusM: number, n = 32): string {
  const latR = radiusM / 111000
  const lngR = radiusM / (111000 * Math.cos(centerLat * Math.PI / 180))
  const coordinates: number[][] = []
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    coordinates.push([
      Number((centerLng + lngR * Math.cos(a)).toFixed(7)),
      Number((centerLat + latR * Math.sin(a)).toFixed(7)),
    ])
  }
  coordinates.push(coordinates[0])
  return JSON.stringify({ type: 'LineString', coordinates })
}

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const Activity = (globalThis as any).Activity
const ClaimAction = (await import('../app/Actions/Territory/ClaimTerritoryAction')).default
const ConquestAction = (await import('../app/Actions/Territory/ProcessActivityConquestAction')).default
const LeaderboardAction = (await import('../app/Actions/Territory/TerritoryLeaderboardAction')).default
const AthleteShowAction = (await import('../app/Actions/Social/AthleteShowAction')).default

async function call(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status: res?.status ?? 200, json }
}

const db = new Database('database/stacks.sqlite')
const xpOf = (userId: number) => (db.query('SELECT xp FROM territory_stats WHERE user_id = ?').get(userId) as any)?.xp ?? 0

// --- Part 2: a fresh claim awards XP --------------------------------------------

const xpBefore = xpOf(1)
const claimActivity = await Activity.forceCreate({
  user_id: 1,
  activity_type: 'Trail Run',
  distance: 1.5,
  duration: '15:00',
  // A closed loop far from the seeded Oakland territories (no overlap).
  gpx_data: loopGeoJson(41.5, -99.5, 90),
  completed_at: new Date().toISOString(),
})
const claim = await call(ClaimAction, { activity_id: claimActivity.id, user_id: 1 })
check('claim succeeds and returns xpGained + totalXp', claim.status === 200 && claim.json?.success === true
  && typeof claim.json?.xpGained === 'number' && typeof claim.json?.totalXp === 'number', JSON.stringify({ xpGained: claim.json?.xpGained, totalXp: claim.json?.totalXp }))
const expectedClaimXp = XP_REWARDS.claim(claim.json?.territory?.areaSize ?? 0)
check('claim xpGained matches the area formula', claim.json?.xpGained === expectedClaimXp, `${claim.json?.xpGained} vs ${expectedClaimXp}`)
check('XP persisted to territory_stats', xpOf(1) === xpBefore + expectedClaimXp, `${xpOf(1)} vs ${xpBefore + expectedClaimXp}`)
check('totalXp echoes the persisted value', claim.json?.totalXp === xpOf(1))

// Replaying the same claim activity must not re-award (idempotency guard).
const xpAfterClaim = xpOf(1)
const claimReplay = await call(ClaimAction, { activity_id: claimActivity.id, user_id: 1 })
check('claim replay → alreadyProcessed, no double XP', claimReplay.json?.alreadyProcessed === true
  && (claimReplay.json?.xpGained ?? 0) === 0 && xpOf(1) === xpAfterClaim, JSON.stringify({ replay: claimReplay.json?.alreadyProcessed, xp: xpOf(1), was: xpAfterClaim }))

// --- Part 3: conquest replay doesn't double-award (idempotent) -------------------

// The seed ran one conquest already; replaying that activity must not re-award.
const conqActivityId = (db.query('SELECT activity_id FROM territory_histories WHERE event_type IN (\'conquered\', \'split\') LIMIT 1').get() as any)?.activity_id
const conqUser = (db.query('SELECT user_id FROM activities WHERE id = ?').get(conqActivityId) as any)?.user_id ?? 1
const xpBeforeReplay = xpOf(conqUser)
const replay = await call(ConquestAction, { activity_id: conqActivityId, user_id: conqUser })
check('conquest replay flagged alreadyProcessed', replay.json?.alreadyProcessed === true)
check('replay awards no XP', (replay.json?.xpGained ?? 0) === 0 && xpOf(conqUser) === xpBeforeReplay, `${xpOf(conqUser)} vs ${xpBeforeReplay}`)
check('conquest response carries xp fields', typeof replay.json?.totalXp === 'number')

// --- Part 4: leaderboard + profile surface XP -----------------------------------

const lb = await call(LeaderboardAction, { type: 'xp' })
const board = lb.json?.leaderboard ?? []
check('xp leaderboard returns xp per entry', board.length > 0 && board.every((e: any) => typeof e.xp === 'number'))
check('xp leaderboard sorted by xp desc', board.every((e: any, i: number) => i === 0 || board[i - 1].xp >= e.xp), JSON.stringify(board.map((e: any) => e.xp)))
check('leaderboard meta.sortBy is xp', lb.json?.meta?.sortBy === 'xp')

const profile = await call(AthleteShowAction, { id: 1 })
check('athlete profile exposes xp', typeof profile.json?.stats?.xp === 'number' && profile.json.stats.xp === xpOf(1))

console.log(failures === 0 ? '\n✅ all XP checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
