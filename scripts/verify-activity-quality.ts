/**
 * Verification harness for activity quality metrics (#952 splits, #953
 * elevation, #960 moving vs elapsed time).
 *
 * Part 1 exercises the pure split/elevation math with synthetic samples.
 * Part 2 round-trips moving_time + splits through the REAL store/show/index
 * actions. Run after `bun scripts/seed-game-world.ts`.
 *
 * Run:  bun scripts/verify-activity-quality.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import {
  computeSplitsFromSamples,
  totalElevationGainFt,
  type RecorderSample,
} from '../resources/functions/splits'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure split math --------------------------------------------------

// Straight-north track: 26 points, 0.1 mi apart, 60 moving-seconds per point
// (a perfectly even 10:00/mi), climbing 10 ft per point (100 ft per mile).
const DEG_PER_TENTH_MILE = 0.1 / 69.09
function syntheticSamples(opts: { pauseGapAt?: number } = {}): RecorderSample[] {
  const samples: RecorderSample[] = []
  let wallMs = 1_750_000_000_000
  for (let i = 0; i <= 25; i++) {
    if (opts.pauseGapAt === i)
      wallMs += 10 * 60 * 1000 // a 10-minute pause: wall clock jumps, movingS doesn't
    samples.push({
      lat: 37 + i * DEG_PER_TENTH_MILE,
      lng: -122,
      t: wallMs,
      eleFt: i * 10,
      movingS: i * 60,
    })
    wallMs += 60 * 1000
  }
  return samples
}

const splits = computeSplitsFromSamples(syntheticSamples())
check('even run yields 3 splits (2 full + partial)', splits.length === 3, JSON.stringify(splits))
check('mile 1 pace exact', splits[0]?.mile === 1 && splits[0]?.pace === '10:00', splits[0]?.pace)
check('mile 2 pace exact', splits[1]?.mile === 2 && splits[1]?.pace === '10:00', splits[1]?.pace)
check('partial mile pace normalized per-mile', splits[2]?.mile === 3 && splits[2]?.pace === '10:00', splits[2]?.pace)
check('per-mile elevation gain', splits[0]?.elev === 100 && splits[1]?.elev === 100, `${splits[0]?.elev}/${splits[1]?.elev}`)

const pausedSplits = computeSplitsFromSamples(syntheticSamples({ pauseGapAt: 5 }))
check('pause gap does not inflate pace (#960)', pausedSplits[0]?.pace === '10:00', pausedSplits[0]?.pace)

// Rolling profile: up 100, down 50, up 30 → gain counts only the ups.
const rolling = [0, 50, 100, 50, 80].map((ele, i) => ({ eleFt: ele, lat: 37 + i * 0.001, lng: -122, t: i, movingS: i }))
check('total gain counts only climbs', totalElevationGainFt(rolling) === 130, String(totalElevationGainFt(rolling)))
check('null altitudes yield zero gain', totalElevationGainFt([{ eleFt: null }, { eleFt: null }]) === 0)

// --- Part 2: backend round-trip ------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const StoreAction = (await import('../app/Actions/Activity/ActivityStoreAction')).default
const ShowAction = (await import('../app/Actions/Activity/ActivityShowAction')).default
const IndexAction = (await import('../app/Actions/Activity/ActivityIndexAction')).default

async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

const stored = await callAction(StoreAction, {
  user_id: 1,
  activity_type: 'Trail Run',
  distance: 2.5,
  duration: '35:00', // elapsed (includes a 10-min pause)
  moving_time: '25:00', // moving
  pace: '10:00/mi',
  elevation: 250,
  splits,
  completed_at: new Date().toISOString(),
})
check('store accepts moving_time + splits', stored.status === 201 && stored.json?.success === true, stored.json?.error)
check('store echoes movingTime', stored.json?.activity?.movingTime === '25:00', stored.json?.activity?.movingTime)

const id = stored.json?.activity?.id
const shown = await callAction(ShowAction, { id })
check('show returns movingTime', shown.json?.activity?.movingTime === '25:00', shown.json?.activity?.movingTime)
check('show returns parsed splits', Array.isArray(shown.json?.activity?.splits)
  && shown.json.activity.splits.length === 3
  && shown.json.activity.splits[0].pace === '10:00', JSON.stringify(shown.json?.activity?.splits?.[0]))

const index = await callAction(IndexAction, { user_id: 1, limit: 5 })
const row = (index.json?.activities ?? []).find((a: any) => a.id === id)
check('index returns movingTime + splits', row?.movingTime === '25:00' && Array.isArray(row?.splits) && row.splits.length === 3)
check('index falls back movingTime=duration for legacy rows',
  (index.json?.activities ?? []).filter((a: any) => a.id !== id).every((a: any) => a.movingTime === a.duration))

console.log(failures === 0 ? '\n✅ all activity quality checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
