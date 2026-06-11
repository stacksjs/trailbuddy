/**
 * Verification harness for user search + @mentions (#971).
 *
 * Part 1 exercises the pure mention parsing (autocomplete query extraction,
 * candidate ranking, linkified segmentation). Part 2 drives the real search
 * action: LIKE matching, case-insensitivity, the discover fallback, and the
 * stat enrichment the discover cards render.
 *
 * Run:  bun scripts/seed-game-world.ts && bun scripts/verify-user-search.ts
 */
/* eslint-disable ts/no-top-level-await */
import { existsSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

import { generateAutoImportFiles, injectGlobalAutoImports } from '@stacksjs/server'
import { path } from '@stacksjs/path'
import { applyMention, extractMentionQuery, mentionCandidates, parseMentions } from '../resources/functions/mentions'

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: pure mention helpers ---------------------------------------------------

const USERS = [
  { id: 1, name: 'You' },
  { id: 2, name: 'Rival Runner' },
  { id: 3, name: 'Trail Explorer' },
]

check('extracts the active @query', extractMentionQuery('nice one @Riv') === 'Riv'
  && extractMentionQuery('@') === '' && extractMentionQuery('hey @Rival Ru') === 'Rival Ru')
check('no @ / mid-word @ → no query', extractMentionQuery('plain text') === null
  && extractMentionQuery('mail me a@b.com') === null)
check('overlong query → no dropdown', extractMentionQuery(`@${'x'.repeat(30)}`) === null)

const ranked = mentionCandidates(USERS, 'r')
check('prefix matches rank above includes', ranked[0]?.name === 'Rival Runner'
  && ranked.some(u => u.name === 'Trail Explorer'), JSON.stringify(ranked.map(u => u.name)))
check('empty query lists everyone (capped)', mentionCandidates(USERS, '').length === 3)

check('applyMention replaces the active query', applyMention('gg @Riv', 'Rival Runner') === 'gg @Rival Runner ')

const segs = parseMentions('thanks @Rival Runner, see you at @Trail Explorer\'s turf!', USERS)
check('parses mentions into linkable segments', segs.length === 5
  && segs[0]?.text === 'thanks ' && segs[1]?.userId === 2 && segs[1]?.text === '@Rival Runner'
  && segs[3]?.userId === 3, JSON.stringify(segs))
check('unknown @name stays plain text', parseMentions('hi @nobody here', USERS).every(s => s.userId === undefined))
check('no mentions → single segment', parseMentions('no ats at all', USERS).length === 1)

// --- Part 2: search action -------------------------------------------------------------

const modelsIndex = path.storagePath('framework/auto-imports/models.ts')
if (!existsSync(modelsIndex))
  await generateAutoImportFiles()
const RealError = globalThis.Error
await injectGlobalAutoImports()
globalThis.Error = RealError

const SearchAction = (await import('../app/Actions/Social/UserSearchAction')).default

async function callAction(action: any, body: Record<string, unknown>): Promise<{ status: number, json: any }> {
  const request = { get: (k: string) => (body as any)[k] }
  const res = await action.handle(request)
  const status = res?.status ?? 200
  let json: any = null
  try { json = await res.clone().json() }
  catch { json = res }
  return { status, json }
}

const like = await callAction(SearchAction, { q: 'rail' })
check('LIKE search matches substrings', like.status === 200
  && like.json?.athletes?.length === 1 && like.json.athletes[0].name === 'Trail Explorer',
JSON.stringify(like.json?.athletes?.map((a: any) => a.name)))

const ci = await callAction(SearchAction, { q: 'RUNNER' })
check('search is case-insensitive', ci.json?.athletes?.length === 1 && ci.json.athletes[0].name === 'Rival Runner')

const discover = await callAction(SearchAction, {})
const names = (discover.json?.athletes ?? []).map((a: any) => a.name)
check('no query → discover list of all athletes', discover.status === 200 && names.length === 3, names.join(','))
check('discover ordered by activity count', discover.json?.athletes?.[0]?.name === 'You'
  && discover.json.athletes[0].activityCount >= discover.json.athletes[1].activityCount)
check('cards get stat enrichment', discover.json?.athletes?.every((a: any) =>
  typeof a.activityCount === 'number' && typeof a.followerCount === 'number' && typeof a.territoriesOwned === 'number'))
const you = discover.json?.athletes?.find((a: any) => a.name === 'You')
check('enrichment reflects the seeded world', you?.activityCount >= 7 && you?.followerCount === 2 && you?.territoriesOwned >= 1,
  JSON.stringify(you))

const none = await callAction(SearchAction, { q: 'zzzzz' })
check('no matches → empty success', none.status === 200 && none.json?.athletes?.length === 0)

console.log(failures === 0 ? '\n✅ all user search checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
