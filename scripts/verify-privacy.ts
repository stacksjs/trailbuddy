/**
 * Verification harness for activity visibility/privacy (#957): the visibility
 * enum + viewer-relationship enforcement in index/show, including the security
 * property that a spoofed viewer over HTTP can't bypass the gate.
 *
 * Seeded social graph: users 2 and 3 follow user 1; user 3 follows user 2;
 * user 2 does NOT follow user 3.
 *
 * MUTATES the seeded world — reseed before running other suites.
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-privacy.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { Database } from 'bun:sqlite'
import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { canViewActivity } from '../resources/functions/visibility'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure predicate ------------------------------------------------------

const following = new Set([1, 2])
check('public visible to anyone (incl anonymous)', canViewActivity({ user_id: 5, visibility: 'public' }, null, new Set()))
check('null visibility treated as public (legacy rows)', canViewActivity({ user_id: 5, visibility: null }, null, new Set()))
check('private only the owner', canViewActivity({ user_id: 3, visibility: 'private' }, 3, new Set())
  && !canViewActivity({ user_id: 3, visibility: 'private' }, 2, following))
check('followers: visible to a follower, not a stranger', canViewActivity({ user_id: 1, visibility: 'followers' }, 9, new Set([1]))
  && !canViewActivity({ user_id: 1, visibility: 'followers' }, 9, new Set([2])))
check('followers: owner always sees own', canViewActivity({ user_id: 7, visibility: 'followers' }, 7, new Set()))

// --- Harness bootstrap -----------------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const StoreAction = (await import('../app/Actions/Activity/ActivityStoreAction')).default
const UpdateAction = (await import('../app/Actions/Activity/ActivityUpdateAction')).default
const IndexAction = (await import('../app/Actions/Activity/ActivityIndexAction')).default
const ShowAction = (await import('../app/Actions/Activity/ActivityShowAction')).default
const AthleteShowAction = (await import('../app/Actions/Social/AthleteShowAction')).default
const ClubShowAction = (await import('../app/Actions/Club/ClubShowAction')).default

async function call(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status: res?.status ?? 200, json }
}

// User 1 posts one activity of each visibility.
const pub = await call(StoreAction, { user_id: 1, activity_type: 'Trail Run', distance: 2, duration: '20:00', visibility: 'public' })
const fol = await call(StoreAction, { user_id: 1, activity_type: 'Trail Run', distance: 2, duration: '20:00', visibility: 'followers' })
const pri = await call(StoreAction, { user_id: 1, activity_type: 'Trail Run', distance: 2, duration: '20:00', visibility: 'private' })
check('store accepts visibility + echoes it', pub.status === 201 && pub.json?.activity?.visibility === 'public'
  && fol.json?.activity?.visibility === 'followers' && pri.json?.activity?.visibility === 'private')
const badVis = await call(StoreAction, { user_id: 1, activity_type: 'Trail Run', distance: 2, duration: '20:00', visibility: 'secret' })
check('invalid visibility → 422', badVis.status === 422 && !!badVis.json?.fields?.visibility)
const pubId = pub.json?.activity?.id
const folId = fol.json?.activity?.id
const priId = pri.json?.activity?.id

const has = (res: any, id: number) => (res.json?.activities ?? []).some((a: any) => a.id === id)

// Anonymous viewer (no viewer_id): only public.
const anon = await call(IndexAction, { user_id: 1 })
check('anonymous index: public yes, followers/private no', has(anon, pubId) && !has(anon, folId) && !has(anon, priId))

// Owner (viewer_id=1): sees all three.
const owner = await call(IndexAction, { user_id: 1, viewer_id: 1 })
check('owner index: sees own public + followers + private', has(owner, pubId) && has(owner, folId) && has(owner, priId))

// Follower (user 2 follows user 1): public + followers, not private.
const follower = await call(IndexAction, { user_id: 1, viewer_id: 2 })
check('follower index: public + followers, not private', has(follower, pubId) && has(follower, folId) && !has(follower, priId))

// --- show gate -------------------------------------------------------------------

check('show private → owner 200', (await call(ShowAction, { id: priId, viewer_id: 1 })).status === 200)
check('show private → follower 403', (await call(ShowAction, { id: priId, viewer_id: 2 })).status === 403)
check('show private → anonymous 403', (await call(ShowAction, { id: priId })).status === 403)
check('show followers → follower 200', (await call(ShowAction, { id: folId, viewer_id: 2 })).status === 200)
check('show followers → anonymous 403', (await call(ShowAction, { id: folId })).status === 403)
check('show public → anonymous 200', (await call(ShowAction, { id: pubId })).status === 200)

// --- non-follower case: user 3 posts 'followers'; user 2 (doesn't follow 3) blocked ---
const fol3 = await call(StoreAction, { user_id: 3, activity_type: 'Hike', distance: 3, duration: '40:00', visibility: 'followers' })
check('non-follower can\'t see a followers-only activity', (await call(ShowAction, { id: fol3.json?.activity?.id, viewer_id: 2 })).status === 403)

// --- security: spoofed viewer over a real HTTP request can't open a private activity ---
const httpReq: any = { url: `/api/activities/${priId}`, headers: {}, query: { viewer_id: '1' }, get: (k: string) => (k === 'id' ? priId : k === 'viewer_id' ? 1 : undefined) }
const spoof = await ShowAction.handle(httpReq)
check('spoofed ?viewer_id over HTTP can\'t open a private activity', (spoof?.status ?? 200) === 403, String(spoof?.status ?? 200))

// --- update visibility ----------------------------------------------------------
const toPrivate = await call(UpdateAction, { id: pubId, user_id: 1, visibility: 'private' })
check('owner can change visibility', toPrivate.status === 200 && toPrivate.json?.activity?.visibility === 'private')
check('now-private activity hidden from anonymous', !has(await call(IndexAction, { user_id: 1 }), pubId))

// --- cross-endpoint leaks: private activities must not surface elsewhere (review #957) ---
const inRecent = (res: any, id: number) => (res.json?.recentActivities ?? []).some((a: any) => a.id === id)
const profAnon = await call(AthleteShowAction, { id: 1 })
check('athlete profile (anonymous) hides the owner\'s private activity', !inRecent(profAnon, priId))
const profOwner = await call(AthleteShowAction, { id: 1, viewer_id: 1 })
check('athlete profile (owner) shows the owner\'s private activity', inRecent(profOwner, priId))

const db = new Database('database/stacks.sqlite', { readonly: true })
const pubClub = db.query('SELECT cm.club_id c FROM club_members cm JOIN clubs cl ON cl.id = cm.club_id WHERE cm.user_id = 1 AND cl.is_private = 0 LIMIT 1').get() as any
if (pubClub) {
  const clubAnon = await call(ClubShowAction, { id: pubClub.c })
  check('club feed (anonymous) hides a member\'s private activity', !((clubAnon.json?.club?.recentFeed ?? []).some((a: any) => a.id === priId)))
}
else {
  check('club feed leak check (skipped: no public club for user 1)', true)
}

console.log(failures === 0 ? '\n✅ all privacy checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
