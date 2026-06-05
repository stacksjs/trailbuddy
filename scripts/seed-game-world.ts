/**
 * Game-world seeder + engine smoke test.
 *
 * Unlike the factory seeders (TrailSeeder etc.), this script exercises the REAL
 * territory engine: it creates users, generates genuine closed-loop GPS tracks,
 * and invokes `ClaimTerritoryAction` / `ProcessActivityConquestAction` exactly
 * as the HTTP layer would. That makes the territories on the map engine-produced
 * (real polygons, areas, history rows) rather than hand-faked.
 *
 * Run:  bun database/seeders/seed-game-world.ts
 *
 * It injects the framework auto-imports (Action, response, models, geo fns) the
 * same way `dev/api.ts` does, so the actions run outside a live server.
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('[seed] UNHANDLED', err); process.exit(1) })
process.on('uncaughtException', (err) => { console.error('[seed] UNCAUGHT', err); process.exit(1) })
import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()

// NOTE: injectGlobalAutoImports() registers a framework `Error` model on
// globalThis, which shadows the built-in Error constructor and breaks
// `x instanceof Error` in every downstream logger. Capture + restore it.
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

console.error('[seed] auto-imports injected, loading actions…')
const g = globalThis as any
const { User, Activity, Trail } = g
const ClaimTerritory = (await import('../app/Actions/Territory/ClaimTerritoryAction')).default
const ProcessConquest = (await import('../app/Actions/Territory/ProcessActivityConquestAction')).default
console.error('[seed] actions loaded')

// --- helpers ---------------------------------------------------------------

/** A clean, exactly-closed loop as a GeoJSON LineString (coords are [lng, lat]). */
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
  coordinates.push(coordinates[0]) // close the ring exactly
  return JSON.stringify({ type: 'LineString', coordinates })
}

/** A straight line (GeoJSON LineString) from A to B, sampled into n points. */
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

/** Invoke an Action handler the way the router does, return parsed JSON + status. */
async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  // handle() returns a Response (via response.json)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

// --- reset game tables (idempotent re-run; leaves trails intact) ------------

const db = new Database('database/stacks.sqlite')
for (const t of ['territory_histories', 'territory_stats', 'territories', 'activities', 'users']) {
  try { db.run(`DELETE FROM ${t}`) }
  catch { /* table may not exist */ }
}
db.close()
console.error('[seed] tables reset, creating users…')

// --- users -----------------------------------------------------------------

const people = [
  { name: 'You', email: 'you@trailbuddy.test', password: 'password123' },
  { name: 'Rival Runner', email: 'rival@trailbuddy.test', password: 'password123' },
  { name: 'Trail Explorer', email: 'explorer@trailbuddy.test', password: 'password123' },
]
const users: any[] = []
for (const p of people) {
  users.push(await User.create(p))
}
console.log(`✅ users: ${users.map((u: any) => `${u.id}:${u.name}`).join(', ')}`)

const trails = (await Trail.limit(5).get()) ?? []

// --- claim territories (REAL ClaimTerritoryAction) -------------------------
// Spread loops across the Bay Area so they don't overlap. Owners alternate so
// "You" (user 1) has enemy turf (Rival's) to conquer below.

const claims = [
  { owner: users[1], lat: 37.7749, lng: -122.4194, r: 130, label: 'Rival downtown loop' }, // target for conquest
  { owner: users[0], lat: 37.8044, lng: -122.2712, r: 150, label: 'Your Oakland loop' },
  { owner: users[2], lat: 37.8716, lng: -122.2727, r: 120, label: 'Explorer Berkeley loop' },
  { owner: users[1], lat: 37.7599, lng: -122.4148, r: 140, label: 'Rival Mission loop' },
]

const claimed: Array<{ territoryId: number, owner: any, lat: number, lng: number, r: number }> = []
for (const c of claims) {
  const activity = await Activity.forceCreate({
    user_id: c.owner.id,
    trail_id: trails[0]?.id ?? null,
    activity_type: 'Trail Run',
    distance: Number((2 * Math.PI * c.r / 1609.34).toFixed(2)),
    duration: '28:00',
    pace: '9:00',
    elevation: 60,
    gpx_data: loopGeoJson(c.lat, c.lng, c.r),
    completed_at: new Date().toISOString(),
  })
  const { status, json } = await callAction(ClaimTerritory, { activity_id: activity.id, user_id: c.owner.id })
  if (json?.success) {
    claimed.push({ territoryId: json.territory.id, owner: c.owner, lat: c.lat, lng: c.lng, r: c.r })
    console.log(`✅ claim "${c.label}" by ${c.owner.name}: territory #${json.territory.id}, area ${Math.round(json.territory.areaSize)} m²`)
  }
  else {
    console.log(`❌ claim "${c.label}" failed [${status}]: ${json?.error}`)
  }
}

// --- conquest (REAL ProcessActivityConquestAction) -------------------------
// "You" run a line straight through Rival's downtown loop -> split/conquest.

const target = claims[0]
const conquestActivity = await Activity.forceCreate({
  user_id: users[0].id,
  trail_id: trails[0]?.id ?? null,
  activity_type: 'Trail Run',
  distance: 1.2,
  duration: '12:00',
  pace: '10:00',
  elevation: 20,
  // Cross well beyond the loop on both sides so the route fully traverses it.
  gpx_data: lineGeoJson(target.lat, target.lng - 0.004, target.lat, target.lng + 0.004),
  completed_at: new Date().toISOString(),
})
const conquest = await callAction(ProcessConquest, { activity_id: conquestActivity.id, user_id: users[0].id })
console.log(`\n🗡️  conquest run by ${users[0].name} [${conquest.status}]: conquered ${conquest.json?.conqueredCount ?? 0} territory(ies)`)
if (conquest.json?.territories?.length) {
  for (const t of conquest.json.territories) {
    console.log(`   - territory #${t.originalId} (owner ${t.originalOwner}): took ${Math.round(t.conqueredArea)} m², left ${Math.round(t.remainingArea)} m²${t.newTerritoryId ? `, new #${t.newTerritoryId}` : ''}`)
  }
}

// --- final state -----------------------------------------------------------

const db2 = new Database('database/stacks.sqlite', { readonly: true })
const counts = ['users', 'trails', 'activities', 'territories', 'territory_histories', 'territory_stats']
  .map(t => `${t}=${(db2.query(`SELECT COUNT(*) c FROM ${t}`).get() as any).c}`)
db2.close()
console.log(`\n📊 ${counts.join('  ')}`)
console.log('✅ seed-game-world complete')
process.exit(0)
