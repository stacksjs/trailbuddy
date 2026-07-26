/**
 * Verification harness for activity CRUD (#954 update/delete, #955 manual
 * entry path).
 *
 * Part 1 exercises the pure duration/pace helpers the manual form + editor
 * share. Part 2 round-trips update rules (ownership, GPS-locking) and Part 3
 * the destroy cascade (kudos/comments die, territory survives unlinked).
 *
 * MUTATES the seeded world (deletes a claim activity) - reseed before running
 * other suites. Run:  bun scripts/seed-game-world.ts && bun scripts/verify-activity-crud.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { paceString, parseDurationToSeconds } from '../resources/functions/duration'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` - ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure duration/pace helpers ----------------------------------------

check('parses MM:SS', parseDurationToSeconds('45:30') === 2730)
check('parses H:MM:SS', parseDurationToSeconds('1:45:30') === 6330)
check('rejects malformed durations', parseDurationToSeconds('garbage') === null && parseDurationToSeconds('90:99') === null)
check('pace from distance + seconds', paceString(5, 2730) === '9:06/mi', paceString(5, 2730))

// --- Harness bootstrap ----------------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const StoreAction = (await import('../app/Actions/Activity/ActivityStoreAction')).default
const UpdateAction = (await import('../app/Actions/Activity/ActivityUpdateAction')).default
const DestroyAction = (await import('../app/Actions/Activity/ActivityDestroyAction')).default
const ShowAction = (await import('../app/Actions/Activity/ActivityShowAction')).default
const KudosAction = (await import('../app/Actions/Activity/KudosToggleAction')).default
const CommentAction = (await import('../app/Actions/Activity/ActivityCommentStoreAction')).default

async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

const db = new Database('database/stacks.sqlite', { readonly: true })
const count = (sql: string, ...args: any[]) => (db.query(sql).get(...args) as any)?.n as number

// --- Part 2: update rules --------------------------------------------------------

const manual = await callAction(StoreAction, {
  user_id: 1,
  activity_type: 'Trail Run',
  distance: 5,
  duration: '50:00',
  moving_time: '50:00',
  pace: '10:00/mi',
  elevation: 200,
  notes: 'first pass',
  completed_at: new Date().toISOString(),
})
const manualId = manual.json?.activity?.id
check('manual activity created (no gpx)', manual.status === 201 && !!manualId && manual.json?.activity?.hasGps === false)

const edit = await callAction(UpdateAction, {
  id: manualId,
  user_id: 1,
  activity_type: 'Hike',
  notes: 'actually a hike',
  distance: 6,
  duration: '1:00:00',
  moving_time: '1:00:00',
  pace: paceString(6, 3600),
  elevation: 350,
})
check('owner edits manual entry (measured fields allowed)', edit.status === 200
  && edit.json?.activity?.activityType === 'Hike'
  && edit.json?.activity?.distance === 6
  && edit.json?.activity?.duration === '1:00:00'
  && edit.json?.activity?.elevation === 350
  && edit.json?.activity?.notes === 'actually a hike', JSON.stringify(edit.json))

const foreignEdit = await callAction(UpdateAction, { id: manualId, user_id: 2, notes: 'hax' })
check('foreign user edit → 403', foreignEdit.status === 403, String(foreignEdit.status))

const emptyEdit = await callAction(UpdateAction, { id: manualId, user_id: 1 })
check('no editable fields → 422', emptyEdit.status === 422, String(emptyEdit.status))

const badType = await callAction(UpdateAction, { id: manualId, user_id: 1, activity_type: 'Swim' })
check('invalid type → 422', badType.status === 422, String(badType.status))

const ghostEdit = await callAction(UpdateAction, { id: 999999, user_id: 1, notes: 'x' })
check('unknown activity → 404', ghostEdit.status === 404, String(ghostEdit.status))

const gpsRun = await callAction(StoreAction, {
  user_id: 1,
  activity_type: 'Trail Run',
  distance: 3,
  duration: '30:00',
  gpx_data: JSON.stringify({ type: 'LineString', coordinates: [[-122, 37], [-122, 37.01]] }),
  completed_at: new Date().toISOString(),
})
const gpsId = gpsRun.json?.activity?.id
check('GPS activity created', gpsRun.status === 201 && !!gpsId && gpsRun.json?.activity?.hasGps === true)

const lockedEdit = await callAction(UpdateAction, { id: gpsId, user_id: 1, distance: 100 })
check('measured edit on GPS run → 422 locked', lockedEdit.status === 422
  && String(lockedEdit.json?.error ?? '').includes('Locked'), JSON.stringify(lockedEdit.json?.error))

const gpsNotes = await callAction(UpdateAction, { id: gpsId, user_id: 1, notes: 'epic views', activity_type: 'Hike' })
check('descriptive edit on GPS run allowed', gpsNotes.status === 200 && gpsNotes.json?.activity?.notes === 'epic views')

// --- Part 3: destroy cascade ------------------------------------------------------

await callAction(KudosAction, { id: manualId, user_id: 2 })
await callAction(CommentAction, { id: manualId, user_id: 2, body: 'nice hike!' })
check('kudos + comment exist before delete',
  count('SELECT COUNT(*) n FROM kudos WHERE activity_id = ?', manualId) === 1
  && count('SELECT COUNT(*) n FROM activity_comments WHERE activity_id = ?', manualId) === 1)

const foreignDelete = await callAction(DestroyAction, { id: manualId, user_id: 2 })
check('foreign user delete → 403, row survives', foreignDelete.status === 403
  && count('SELECT COUNT(*) n FROM activities WHERE id = ?', manualId) === 1)

const del = await callAction(DestroyAction, { id: manualId, user_id: 1 })
check('owner delete succeeds with cascade counts', del.status === 200
  && del.json?.deleted?.kudos === 1 && del.json?.deleted?.comments === 1, JSON.stringify(del.json))
check('activity row gone', count('SELECT COUNT(*) n FROM activities WHERE id = ?', manualId) === 0)
check('kudos + comments cascaded',
  count('SELECT COUNT(*) n FROM kudos WHERE activity_id = ?', manualId) === 0
  && count('SELECT COUNT(*) n FROM activity_comments WHERE activity_id = ?', manualId) === 0)

const showGone = await callAction(ShowAction, { id: manualId })
check('show after delete → 404', showGone.status === 404, String(showGone.status))

const replayDelete = await callAction(DestroyAction, { id: manualId, user_id: 1 })
check('replay delete → 404', replayDelete.status === 404, String(replayDelete.status))

// Territory survival: delete the run that claimed a territory - the land must
// stay owned, only the provenance pointer is cleared.
const tRow = db.query(`
  SELECT t.id tid, t.activity_id aid, t.user_id owner, t.status status
  FROM territories t JOIN activities a ON a.id = t.activity_id
  WHERE t.activity_id IS NOT NULL AND a.user_id = t.user_id
  LIMIT 1
`).get() as any
check('seed world has a claimed territory to test against', !!tRow, 'run seed-game-world first')

if (tRow) {
  const historyBefore = count('SELECT COUNT(*) n FROM territory_histories WHERE activity_id = ?', tRow.aid)
  const claimDelete = await callAction(DestroyAction, { id: tRow.aid, user_id: tRow.owner })
  check('claim-run delete succeeds and unlinks territory', claimDelete.status === 200
    && claimDelete.json?.deleted?.territoriesUnlinked >= 1
    && claimDelete.json?.deleted?.historyUnlinked === historyBefore, JSON.stringify(claimDelete.json?.deleted))

  const tAfter = db.query('SELECT status, activity_id, user_id FROM territories WHERE id = ?').get(tRow.tid) as any
  check('territory survives delete (status + owner unchanged)',
    tAfter?.status === tRow.status && tAfter?.user_id === tRow.owner, JSON.stringify(tAfter))
  check('territory provenance nulled', tAfter?.activity_id === null, String(tAfter?.activity_id))
  check('history rows unlinked, not deleted',
    count('SELECT COUNT(*) n FROM territory_histories WHERE activity_id = ?', tRow.aid) === 0)
  check('claim activity row gone', count('SELECT COUNT(*) n FROM activities WHERE id = ?', tRow.aid) === 0)
}

console.log(failures === 0 ? '\n✅ all activity CRUD checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
