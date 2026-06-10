/**
 * Verification harness for territory decay/expiry (#950).
 *
 * Run AFTER `bun scripts/seed-game-world.ts`. Exercises the decay ladder
 * against the REAL actions:
 *   1. stale active territory      → contested (history + notification)
 *   2. repeat sweep                → no duplicate event
 *   3. owner defends decaying land → back to active, clock reset
 *   4. abandoned contested land    → expired (stats + history + notification)
 *   5. expired land                → reclaimable by a fresh claim
 *   6. map endpoint                → expired territory gone
 *   7. owner patrol of active land → freshness refreshed
 *
 * Run:  bun scripts/verify-territory-decay.ts
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
const DecayTerritories = (await import('../app/Actions/Territory/DecayTerritoriesAction')).default
const TerritoriesForMap = (await import('../app/Actions/Territory/GetTerritoriesForMapAction')).default

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

async function runActivity(userId: number, gpx: string): Promise<any> {
  return Activity.forceCreate({
    user_id: userId,
    trail_id: null,
    activity_type: 'Trail Run',
    distance: 1,
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

function exec(sql: string): void {
  const db = new Database('database/stacks.sqlite')
  db.run(sql)
  db.close()
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString()
}

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// Seeded world: user 1 = You, 2 = Rival, 3 = Explorer.
const BERKELEY = { lat: 37.8716, lng: -122.2727 } // territory #3, owner 3
const OAKLAND = { lat: 37.8044, lng: -122.2712 } // territory #2, owner 1
const MISSION = { lat: 37.7599, lng: -122.4148 } // territory #4, owner 2

const berkeley = q(`SELECT id, user_id FROM territories WHERE ABS(center_lat - ${BERKELEY.lat}) < 0.002 AND ABS(center_lng - ${BERKELEY.lng}) < 0.002`)
const oakland = q(`SELECT id, user_id FROM territories WHERE ABS(center_lat - ${OAKLAND.lat}) < 0.002 AND ABS(center_lng - ${OAKLAND.lng}) < 0.002`)
const mission = q(`SELECT id, user_id FROM territories WHERE ABS(center_lat - ${MISSION.lat}) < 0.002 AND ABS(center_lng - ${MISSION.lng}) < 0.002`)
if (!berkeley || !oakland || !mission) {
  console.error('Seeded territories not found — run scripts/seed-game-world.ts first.')
  process.exit(1)
}
console.log(`world: Berkeley=#${berkeley.id}, Oakland=#${oakland.id}, Mission=#${mission.id}\n`)

// --- 1. stale active territory → contested -----------------------------------
exec(`UPDATE territories SET last_activity_at = '${daysAgoIso(20)}', claimed_at = '${daysAgoIso(20)}' WHERE id = ${berkeley.id}`)
const sweep1 = await callAction(DecayTerritories, {})
check('1: sweep succeeded', sweep1.status === 200 && sweep1.json?.success === true)
check('1: stale territory contested', sweep1.json?.contested?.some((c: any) => c.id === berkeley.id) === true
  && q(`SELECT status FROM territories WHERE id = ${berkeley.id}`)?.status === 'contested')
check('1: decay history row written', q(`SELECT COUNT(*) c FROM territory_histories WHERE territory_id = ${berkeley.id} AND event_type = 'contested' AND notes LIKE '%decaying%'`)?.c === 1)
check('1: owner notified of decay', q(`SELECT COUNT(*) c FROM user_notifications WHERE recipient_id = 3 AND body LIKE '%decaying%'`)?.c === 1)

// --- 2. repeat sweep → no duplicate ------------------------------------------
const sweep2 = await callAction(DecayTerritories, {})
check('2: repeat sweep contests nothing new', (sweep2.json?.contestedCount ?? -1) === 0 && (sweep2.json?.expiredCount ?? -1) === 0)
check('2: still one decay history row', q(`SELECT COUNT(*) c FROM territory_histories WHERE territory_id = ${berkeley.id} AND event_type = 'contested'`)?.c === 1)

// --- 3. owner defends decaying land → active, clock reset ---------------------
const defendAct = await runActivity(3, lineGeoJson(BERKELEY.lat, BERKELEY.lng - 0.0030, BERKELEY.lat, BERKELEY.lng + 0.0030))
const defend = await callAction(ProcessConquest, { activity_id: defendAct.id, user_id: 3 })
check('3: decaying land defended', defend.json?.defended?.some((d: any) => d.id === berkeley.id) === true
  && q(`SELECT status FROM territories WHERE id = ${berkeley.id}`)?.status === 'active')
const sweep3 = await callAction(DecayTerritories, {})
check('3: defended land survives next sweep', (sweep3.json?.contestedCount ?? -1) === 0
  && q(`SELECT status FROM territories WHERE id = ${berkeley.id}`)?.status === 'active')

// --- 4. abandoned land expires (contest rung, then expiry rung) ---------------
exec(`UPDATE territories SET last_activity_at = '${daysAgoIso(40)}', claimed_at = '${daysAgoIso(40)}' WHERE id = ${mission.id}`)
const rivalBefore = q(`SELECT total_territories_owned o, ROUND(total_area_owned) a, territories_lost l FROM territory_stats WHERE user_id = 2`)
const sweep4a = await callAction(DecayTerritories, {})
check('4: deeply stale land contested first (grace rung)', sweep4a.json?.contested?.some((c: any) => c.id === mission.id) === true)
const sweep4b = await callAction(DecayTerritories, {})
check('4: then expires on the next sweep', sweep4b.json?.expired?.some((e: any) => e.id === mission.id) === true
  && q(`SELECT status FROM territories WHERE id = ${mission.id}`)?.status === 'expired')
check('4: expiry history row written', q(`SELECT COUNT(*) c FROM territory_histories WHERE territory_id = ${mission.id} AND event_type = 'expired'`)?.c === 1)
const rivalAfter = q(`SELECT total_territories_owned o, ROUND(total_area_owned) a, territories_lost l FROM territory_stats WHERE user_id = 2`)
check('4: owner stats updated', rivalAfter?.o === rivalBefore?.o - 1 && rivalAfter?.l === rivalBefore?.l + 1
  && rivalAfter?.a < rivalBefore?.a, `owned ${rivalBefore?.o}→${rivalAfter?.o}, lost ${rivalBefore?.l}→${rivalAfter?.l}, area ${rivalBefore?.a}→${rivalAfter?.a}`)
check('4: owner notified of expiry', q(`SELECT COUNT(*) c FROM user_notifications WHERE recipient_id = 2 AND body LIKE '%expired%'`)?.c === 1)

// --- 5. expired land is reclaimable -------------------------------------------
const reclaimAct = await runActivity(1, loopGeoJson(MISSION.lat, MISSION.lng, 100))
const reclaim = await callAction(ClaimTerritory, { activity_id: reclaimAct.id, user_id: 1 })
check('5: claim over expired land succeeds', reclaim.json?.success === true, reclaim.json?.error)

// --- 6. expired territory is off the map ---------------------------------------
const map = await callAction(TerritoriesForMap, { limit: 100 })
check('6: expired territory not on the map', !(map.json?.features ?? []).some((f: any) => f.properties.id === mission.id))

// --- 7. owner patrol refreshes freshness ---------------------------------------
exec(`UPDATE territories SET last_activity_at = '${daysAgoIso(10)}' WHERE id = ${oakland.id}`)
const patrolAct = await runActivity(1, lineGeoJson(OAKLAND.lat, OAKLAND.lng - 0.0030, OAKLAND.lat, OAKLAND.lng + 0.0030))
await callAction(ProcessConquest, { activity_id: patrolAct.id, user_id: 1 })
const freshness = q(`SELECT last_activity_at f FROM territories WHERE id = ${oakland.id}`)?.f
const ageMs = Date.now() - new Date(freshness).getTime()
check('7: patrol refreshed last_activity_at', ageMs < 60000, `age ${Math.round(ageMs / 1000)}s`)

console.log(failures === 0 ? '\n✅ all territory decay checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
