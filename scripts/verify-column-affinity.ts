/**
 * Verification harness for numeric column affinity (#974): float-holding
 * columns (lat/lng/area/perimeter/rating/distance/elevation) must have REAL
 * affinity; ids and counts must stay INTEGER; and fractional values must
 * round-trip through a fresh migrate without truncation.
 *
 * Run after a fresh migrate + seed:
 *   bun scripts/seed-game-world.ts && bun scripts/verify-column-affinity.ts
 */
/* eslint-disable ts/no-top-level-await */
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

const db = new Database('database/stacks.sqlite')
function colType(table: string, col: string): string {
  const info = db.query(`PRAGMA table_info(${table})`).all() as any[]
  return info.find(c => c.name === col)?.type ?? '(missing)'
}

// --- REAL float columns ----------------------------------------------------------

const REAL_COLS: Array<[string, string]> = [
  ['trails', 'latitude'], ['trails', 'longitude'], ['trails', 'rating'], ['trails', 'distance'], ['trails', 'elevation'],
  ['territories', 'center_lat'], ['territories', 'center_lng'], ['territories', 'area_size'], ['territories', 'perimeter'],
  ['activities', 'distance'], ['activities', 'elevation'],
  ['territory_stats', 'total_area_owned'], ['territory_stats', 'largest_territory_area'],
  ['challenges', 'area_at_stake'],
  ['territory_histories', 'area_at_event'],
  ['user_stats', 'total_distance'], ['user_stats', 'total_elevation'],
]
for (const [t, c] of REAL_COLS)
  check(`${t}.${c} is REAL`, colType(t, c) === 'REAL', colType(t, c))

// --- INTEGER id/count columns (must NOT have become REAL) -------------------------

const INT_COLS: Array<[string, string]> = [
  ['territories', 'user_id'], ['territories', 'activity_id'], ['territories', 'conquest_count'],
  ['activities', 'user_id'], ['activities', 'kudos_count'],
  ['trails', 'review_count'],
  ['territory_stats', 'total_territories_owned'], ['territory_stats', 'territories_conquered'], ['territory_stats', 'weekly_rank'],
  ['challenges', 'challenger_id'], ['challenges', 'winner_id'],
  ['user_stats', 'trails_completed'], ['user_stats', 'current_streak'], ['user_stats', 'total_activities'],
  ['reviews_alias_skip', 'noop'],
]
for (const [t, c] of INT_COLS) {
  if (t === 'reviews_alias_skip')
    continue
  check(`${t}.${c} stays INTEGER`, colType(t, c) === 'INTEGER', colType(t, c))
}

// --- fractional values survive a fresh migrate -----------------------------------

const terr = db.query('SELECT area_size, center_lat, center_lng, perimeter FROM territories WHERE area_size IS NOT NULL LIMIT 1').get() as any
check('seeded territory floats are fractional (not truncated)', !!terr
  && terr.area_size % 1 !== 0 && terr.center_lat % 1 !== 0, JSON.stringify(terr))

// Insert a deliberately fractional row and read it back exactly.
const probe = 123456.789012
db.query('INSERT INTO territories (user_id, name, status, area_size, center_lat, center_lng, perimeter) VALUES (1, \'affinity-probe\', \'active\', ?, ?, ?, ?)')
  .run(probe, 12.3456789, -98.7654321, 42.42)
const back = db.query('SELECT area_size, center_lat FROM territories WHERE name = \'affinity-probe\'').get() as any
check('fractional value round-trips exactly through REAL', back?.area_size === probe && back?.center_lat === 12.3456789, JSON.stringify(back))
check('stored as REAL storage class (not text/int)',
  (db.query('SELECT typeof(area_size) t FROM territories WHERE name = \'affinity-probe\'').get() as any)?.t === 'real')
db.query('DELETE FROM territories WHERE name = \'affinity-probe\'').run()

console.log(failures === 0 ? '\n✅ all column affinity checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
