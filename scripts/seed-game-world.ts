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
const gameTables = [
  'user_notifications', 'activity_comments', 'kudos', 'follows', 'trail_reviews',
  'territory_histories', 'territory_stats', 'territories', 'activities', 'users',
]
for (const t of gameTables) {
  try { db.run(`DELETE FROM ${t}`) }
  catch { /* table may not exist */ }
}
// Reset AUTOINCREMENT so "You" lands on id 1 — the frontend hardwires
// currentUserId: 1, so the seeded world must line up for the live UI.
for (const t of gameTables) {
  try { db.run(`DELETE FROM sqlite_sequence WHERE name = ?`, [t]) }
  catch { /* sqlite_sequence may not exist yet */ }
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

// --- feed activities -------------------------------------------------------
// A spread of plain (no-GPS) activities across users/trails/types/dates so the
// feed renders a populated, realistic timeline from the DB (not seed).

const TYPES = ['Trail Run', 'Hike', 'Walk', 'Bike']
const DAY = 24 * 60 * 60 * 1000
const feedPlan = [
  { u: 0, t: 0, type: 'Trail Run', dist: 5.6, dur: '52:18', pace: '9:20/mi', elev: 1250, days: 0 },
  { u: 1, t: 1, type: 'Hike', dist: 8.4, dur: '5:12:30', pace: '37:00/mi', elev: 2847, days: 0 },
  { u: 0, t: 2, type: 'Trail Run', dist: 2.8, dur: '26:45', pace: '9:33/mi', elev: 280, days: 1 },
  { u: 2, t: 3, type: 'Trail Run', dist: 7.9, dur: '1:08:34', pace: '8:41/mi', elev: 2100, days: 1 },
  { u: 1, t: 4, type: 'Walk', dist: 3.2, dur: '58:20', pace: '18:13/mi', elev: 420, days: 2 },
  { u: 0, t: 0, type: 'Trail Run', dist: 4.8, dur: '42:05', pace: '8:46/mi', elev: 780, days: 2 },
  { u: 2, t: 1, type: 'Hike', dist: 12.4, dur: '7:45:00', pace: '37:30/mi', elev: 4200, days: 3 },
  { u: 1, t: 2, type: 'Bike', dist: 11.6, dur: '48:30', pace: '14.4 mph', elev: 1100, days: 3 },
  { u: 0, t: 3, type: 'Trail Run', dist: 3.6, dur: '30:12', pace: '8:23/mi', elev: 480, days: 4 },
  { u: 2, t: 4, type: 'Hike', dist: 5.8, dur: '2:45:00', pace: '28:27/mi', elev: 1100, days: 5 },
  { u: 1, t: 0, type: 'Trail Run', dist: 9.6, dur: '1:15:20', pace: '7:51/mi', elev: 1560, days: 6 },
  { u: 0, t: 2, type: 'Walk', dist: 4.2, dur: '1:12:00', pace: '17:08/mi', elev: 350, days: 7 },
]
const NOW = Date.now()
let feedCount = 0
for (const p of feedPlan) {
  const owner = users[p.u]
  const trail = trails[p.t]
  const completed = new Date(NOW - p.days * DAY - feedCount * 1500 * 1000).toISOString()
  await Activity.forceCreate({
    user_id: owner.id,
    trail_id: trail?.id ?? null,
    activity_type: TYPES.includes(p.type) ? p.type : 'Trail Run',
    distance: p.dist,
    duration: p.dur,
    pace: p.pace,
    elevation: p.elev,
    kudos_count: 0,
    gpx_data: null,
    completed_at: completed,
  })
  feedCount++
}
console.log(`✅ feed activities: ${feedCount} across ${users.length} users`)

// --- follow graph ----------------------------------------------------------
// You(1) follows Rival + Explorer; both follow You back; Explorer follows Rival.

const Follow = g.Follow
const followPlan: Array<[number, number]> = [
  [users[0].id, users[1].id], // You -> Rival
  [users[0].id, users[2].id], // You -> Explorer
  [users[1].id, users[0].id], // Rival -> You
  [users[2].id, users[0].id], // Explorer -> You
  [users[2].id, users[1].id], // Explorer -> Rival
]
for (const [follower, following] of followPlan) {
  await Follow.forceCreate({ follower_id: follower, following_id: following })
}
console.log(`✅ follows: ${followPlan.length} edges`)

// --- notifications ---------------------------------------------------------
// A few notifications for "You" so the page shows DB-backed data on first load.

const UserNotification = g.UserNotification
const firstActivity = (await Activity.where('user_id', '=', users[0].id).first())
const notifPlan = [
  { actor: users[1], type: 'kudos', body: 'Rival Runner gave kudos to your activity', link: firstActivity ? `/activity/${firstActivity.id}` : '/feed', read: false },
  { actor: users[2], type: 'comment', body: 'Trail Explorer commented on your activity', link: firstActivity ? `/activity/${firstActivity.id}` : '/feed', read: false },
  { actor: users[1], type: 'follow', body: 'Rival Runner started following you', link: `/athlete/${users[1].id}`, read: false },
  { actor: users[2], type: 'follow', body: 'Trail Explorer started following you', link: `/athlete/${users[2].id}`, read: true },
]
for (const n of notifPlan) {
  await UserNotification.forceCreate({
    recipient_id: users[0].id,
    actor_id: n.actor.id,
    actor_name: n.actor.name,
    type: n.type,
    body: n.body,
    link: n.link,
    read: n.read,
  })
}
console.log(`✅ notifications: ${notifPlan.length} for ${users[0].name}`)

// --- trail reviews + honest counters (#973) --------------------------------
// Every trail gets 1-3 reviews from the three athletes, then the denormalized
// counters (kudos_count, rating, review_count) are rebuilt from rows so the
// factory numbers can't drift from reality.

const Review = g.Review
const allTrails = ((await Trail.all()) ?? []) as any[]
const reviewBlurbs = [
  'Great climbs and even better views from the top.',
  'Well marked the whole way, a little crowded on weekends.',
  'Muddy after rain but absolutely worth it.',
  'Perfect tempo-run terrain, rolling and runnable.',
  'Quiet, shaded, and the descent is a blast.',
]
let reviewCount = 0
for (const [i, trail] of allTrails.entries()) {
  const reviewers = users.slice(0, (i % 3) + 1) // 1-3 reviewers per trail
  for (const [j, reviewer] of reviewers.entries()) {
    await Review.forceCreate({
      user_id: reviewer.id,
      trail_id: trail.id,
      rating: 3 + ((i + j) % 3), // 3-5 stars, deterministic
      title: null,
      content: reviewBlurbs[(i + j) % reviewBlurbs.length],
      conditions: ['excellent', 'good', 'fair'][(i + j) % 3],
      visit_date: null,
      helpful_count: 0,
      photos: null,
    })
    reviewCount++
  }
}
const { recomputeDenormalizedCounters } = await import('../app/Actions/Maintenance/RecomputeCountersAction')
const counterResult = await recomputeDenormalizedCounters()
console.log(`✅ trail reviews: ${reviewCount} seeded; counters fixed (${counterResult.activitiesFixed} activities, ${counterResult.trailsFixed} trails)`)

// --- final state -----------------------------------------------------------

const db2 = new Database('database/stacks.sqlite', { readonly: true })
const counts = ['users', 'trails', 'activities', 'territories', 'territory_histories', 'territory_stats', 'trail_reviews']
  .map(t => `${t}=${(db2.query(`SELECT COUNT(*) c FROM ${t}`).get() as any).c}`)
db2.close()
console.log(`\n📊 ${counts.join('  ')}`)
console.log('✅ seed-game-world complete')
process.exit(0)
