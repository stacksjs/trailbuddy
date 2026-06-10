/**
 * Verification harness for the defend/contest battle flow (#941).
 *
 * Run AFTER `bun scripts/seed-game-world.ts` (fresh world). Exercises the full
 * state machine against the REAL actions:
 *   A. graze an enemy territory            → contested + history + notification
 *   B. graze it again (different attacker) → no duplicate event
 *   C. owner runs through contested land   → defended + stats + notification
 *   D. sliver-cut a big territory          → contested (not conquered)
 *   E. clean cut through a tiny territory  → full takeover (finishing blow)
 *   F. replay the defense activity         → idempotent no-op
 *   G. map endpoint                        → contested visible + defendCount
 *
 * Run:  bun scripts/verify-territory-battles.ts
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

const g = globalThis as any
const { Activity } = g
const ClaimTerritory = (await import('../app/Actions/Territory/ClaimTerritoryAction')).default
const ProcessConquest = (await import('../app/Actions/Territory/ProcessActivityConquestAction')).default
const TerritoriesForMap = (await import('../app/Actions/Territory/GetTerritoriesForMapAction')).default

// --- helpers (same conventions as seed-game-world.ts) -----------------------

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

function lineGeoJson(fromLat: number, fromLng: number, toLat: number, toLng: number, n = 24): string {
  const coordinates: number[][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    coordinates.push([
      Number((fromLng + (toLng - fromLng) * t).toFixed(7)),
      Number((fromLat + (toLat - fromLat) * t).toFixed(7)),
    ])
  }
  return JSON.stringify({ type: 'LineString', coordinates })
}

async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

async function runActivity(userId: number, gpx: string, distance = 1): Promise<any> {
  return Activity.forceCreate({
    user_id: userId,
    trail_id: null,
    activity_type: 'Trail Run',
    distance,
    duration: '20:00',
    pace: '9:00',
    elevation: 10,
    gpx_data: gpx,
    completed_at: new Date().toISOString(),
  })
}

function q(sql: string): any {
  const db = new Database('database/stacks.sqlite', { readonly: true })
  const row = db.query(sql).get()
  db.close()
  return row
}

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// --- seeded world layout (from seed-game-world.ts) ---------------------------
// user 1 = You, user 2 = Rival Runner, user 3 = Trail Explorer
const MISSION = { lat: 37.7599, lng: -122.4148, r: 140 } // territory #4, owner 2
const OAKLAND = { lat: 37.8044, lng: -122.2712, r: 150 } // territory #2, owner 1
const TINY = { lat: 37.7000, lng: -122.4500, r: 24 } // claimed in scenario E

const mission = q(`SELECT id, user_id FROM territories WHERE ABS(center_lat - ${MISSION.lat}) < 0.002 AND ABS(center_lng - ${MISSION.lng}) < 0.002`)
const oakland = q(`SELECT id, user_id FROM territories WHERE ABS(center_lat - ${OAKLAND.lat}) < 0.002 AND ABS(center_lng - ${OAKLAND.lng}) < 0.002`)
if (!mission || !oakland) {
  console.error('Seeded territories not found — run scripts/seed-game-world.ts first.')
  process.exit(1)
}
console.log(`world: Mission=#${mission.id} (owner ${mission.user_id}), Oakland=#${oakland.id} (owner ${oakland.user_id})\n`)

// --- A. graze → contested ----------------------------------------------------
// "You" (1) run from outside Mission to its center: 1 boundary crossing, no cut.
const grazeAct = await runActivity(1, lineGeoJson(MISSION.lat, MISSION.lng - 0.0040, MISSION.lat, MISSION.lng))
const graze = await callAction(ProcessConquest, { activity_id: grazeAct.id, user_id: 1 })
check('A: graze succeeded', graze.status === 200 && graze.json?.success === true)
check('A: nothing conquered', (graze.json?.conqueredCount ?? -1) === 0)
check('A: territory reported contested', graze.json?.contested?.some((c: any) => c.id === mission.id) === true)
check('A: status flipped to contested', q(`SELECT status FROM territories WHERE id = ${mission.id}`)?.status === 'contested')
check('A: contested history row written', q(`SELECT COUNT(*) c FROM territory_histories WHERE territory_id = ${mission.id} AND event_type = 'contested'`)?.c === 1)
check('A: owner notified of attack', q(`SELECT COUNT(*) c FROM user_notifications WHERE recipient_id = ${mission.user_id} AND type = 'conquest_attack'`)?.c >= 1)

// --- B. second graze → no duplicate event ------------------------------------
const graze2Act = await runActivity(3, lineGeoJson(MISSION.lat, MISSION.lng + 0.0040, MISSION.lat, MISSION.lng))
const graze2 = await callAction(ProcessConquest, { activity_id: graze2Act.id, user_id: 3 })
check('B: repeat graze succeeded', graze2.status === 200 && graze2.json?.success === true)
check('B: not re-reported as contested', (graze2.json?.contested ?? []).length === 0)
check('B: still exactly one contested row', q(`SELECT COUNT(*) c FROM territory_histories WHERE territory_id = ${mission.id} AND event_type = 'contested'`)?.c === 1)

// --- C. owner defends --------------------------------------------------------
// Rival (2) runs straight through their own contested Mission territory.
const defendAct = await runActivity(2, lineGeoJson(MISSION.lat, MISSION.lng - 0.0040, MISSION.lat, MISSION.lng + 0.0040))
const defend = await callAction(ProcessConquest, { activity_id: defendAct.id, user_id: 2 })
check('C: defense succeeded', defend.status === 200 && defend.json?.success === true)
check('C: territory reported defended', defend.json?.defended?.some((d: any) => d.id === mission.id) === true)
check('C: status back to active', q(`SELECT status FROM territories WHERE id = ${mission.id}`)?.status === 'active')
check('C: defended history row written', q(`SELECT COUNT(*) c FROM territory_histories WHERE territory_id = ${mission.id} AND event_type = 'defended'`)?.c === 1)
check('C: territories_defended incremented', q(`SELECT territories_defended d FROM territory_stats WHERE user_id = 2`)?.d === 1)
check('C: defender notified', q(`SELECT COUNT(*) c FROM user_notifications WHERE recipient_id = 2 AND type = 'conquest_defend'`)?.c === 1)

// --- D. sliver cut on a big territory → contested, not conquered --------------
// Rival (2) clips the very top of Oakland (~150 m radius): chord 6 m inside the
// rim cuts a few-hundred-m² sliver — far below MIN_TERRITORY_SIZE.
const sliverLat = OAKLAND.lat + 0.0013
const sliverAct = await runActivity(2, lineGeoJson(sliverLat, OAKLAND.lng - 0.0040, sliverLat, OAKLAND.lng + 0.0040))
const sliver = await callAction(ProcessConquest, { activity_id: sliverAct.id, user_id: 2 })
check('D: sliver attack succeeded', sliver.status === 200 && sliver.json?.success === true)
check('D: nothing conquered', (sliver.json?.conqueredCount ?? -1) === 0)
check('D: big territory contested instead', sliver.json?.contested?.some((c: any) => c.id === oakland.id) === true
  && q(`SELECT status FROM territories WHERE id = ${oakland.id}`)?.status === 'contested')
check('D: owner notified of attack', q(`SELECT COUNT(*) c FROM user_notifications WHERE recipient_id = 1 AND type = 'conquest_attack'`)?.c >= 1)

// --- E. finishing blow on a minimum-scale territory ---------------------------
// Explorer (3) claims a tiny loop (~1,800 m² < 2×MIN), then You (1) cut it clean
// through — too small to subdivide, so the whole territory falls.
const tinyClaimAct = await runActivity(3, loopGeoJson(TINY.lat, TINY.lng, TINY.r), 0.1)
const tinyClaim = await callAction(ClaimTerritory, { activity_id: tinyClaimAct.id, user_id: 3 })
check('E: tiny claim succeeded', tinyClaim.json?.success === true, tinyClaim.json?.error)
const tinyId = tinyClaim.json?.territory?.id
const explorerLostBefore = q(`SELECT territories_lost l, total_territories_owned o FROM territory_stats WHERE user_id = 3`)

const blowAct = await runActivity(1, lineGeoJson(TINY.lat, TINY.lng - 0.0020, TINY.lat, TINY.lng + 0.0020))
const blow = await callAction(ProcessConquest, { activity_id: blowAct.id, user_id: 1 })
check('E: finishing blow conquered it whole', blow.json?.conqueredCount === 1
  && blow.json?.territories?.[0]?.originalId === tinyId
  && blow.json?.territories?.[0]?.remainingArea === 0)
check('E: ownership transferred', q(`SELECT user_id u, status s FROM territories WHERE id = ${tinyId}`)?.u === 1)
check('E: finishing-blow history row', q(`SELECT COUNT(*) c FROM territory_histories WHERE territory_id = ${tinyId} AND event_type = 'conquered' AND notes LIKE '%finishing blow%'`)?.c === 1)
const explorerLostAfter = q(`SELECT territories_lost l, total_territories_owned o FROM territory_stats WHERE user_id = 3`)
check('E: loser stats updated', explorerLostAfter?.l === (explorerLostBefore?.l ?? 0) + 1
  && explorerLostAfter?.o === (explorerLostBefore?.o ?? 0) - 1)
check('E: loser notified', q(`SELECT COUNT(*) c FROM user_notifications WHERE recipient_id = 3 AND type = 'conquest_attack'`)?.c >= 1)

// --- F. replaying a battle activity is a no-op --------------------------------
const replay = await callAction(ProcessConquest, { activity_id: defendAct.id, user_id: 2 })
check('F: replay flagged alreadyProcessed', replay.json?.alreadyProcessed === true)
check('F: defense not double-counted', q(`SELECT territories_defended d FROM territory_stats WHERE user_id = 2`)?.d === 1)

// --- G. map surfaces contested state + defend counts ---------------------------
const map = await callAction(TerritoriesForMap, { limit: 100 })
const features: any[] = map.json?.features ?? []
const oaklandFeature = features.find(f => f.properties.id === oakland.id)
const missionFeature = features.find(f => f.properties.id === mission.id)
check('G: contested territory on the map', oaklandFeature?.properties?.status === 'contested')
check('G: defend count surfaced', missionFeature?.properties?.defendCount === 1, `got ${missionFeature?.properties?.defendCount}`)

console.log(failures === 0 ? '\n✅ all territory battle checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
