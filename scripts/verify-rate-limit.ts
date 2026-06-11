/**
 * Verification harness for rate limiting (#980).
 *
 * The Throttle middleware runs in the HTTP router layer (in-process action
 * harnesses bypass it), so this suite drives the same primitives the
 * middleware uses — parseThrottleString + createRateLimitMiddleware from
 * @stacksjs/router — with synthetic requests, then statically asserts the
 * route tiers in routes/api.ts are wired the way the documentation block
 * says they are.
 *
 * Run:  bun scripts/verify-rate-limit.ts   (no seed required)
 */
/* eslint-disable ts/no-top-level-await */
import { readFileSync } from 'node:fs'
import process from 'node:process'

process.on('unhandledRejection', (err) => { console.error('UNHANDLED', err); process.exit(1) })

const { parseThrottleString, createRateLimitMiddleware } = await import('@stacksjs/router')

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

// --- Part 1: throttle pattern parsing ----------------------------------------------

const game = parseThrottleString('30,1')
const sweep = parseThrottleString('10,1')
const social = parseThrottleString('60,1')
check('parses the three documented tiers', game.maxAttempts === 30 && game.windowMs === 60000
  && sweep.maxAttempts === 10 && sweep.windowMs === 60000
  && social.maxAttempts === 60 && social.windowMs === 60000)
const seconds = parseThrottleString('10,30s')
const hours = parseThrottleString('1000,1h')
check('parses seconds/hours windows', seconds.maxAttempts === 10 && seconds.windowMs === 30000
  && hours.maxAttempts === 1000 && hours.windowMs === 3600000)

// --- Part 2: enforcement -------------------------------------------------------------

const fakeReq = (ip: string) => ({
  headers: new Headers({ 'x-forwarded-for': ip }),
  url: 'http://localhost/api/territories/claim',
  method: 'POST',
})

const limiter = createRateLimitMiddleware(parseThrottleString('3,1'), 'verify:throttle')
const results: Array<Response | null> = []
for (let i = 0; i < 5; i++)
  results.push(await limiter(fakeReq('10.0.0.1') as any, async () => null))

check('requests within the limit pass', results.slice(0, 3).every(r => !(r instanceof Response)))
const blocked = results[3]
check('request over the limit → 429', blocked instanceof Response && blocked.status === 429)
check('429 carries Retry-After + X-RateLimit headers', blocked instanceof Response
  && Number(blocked.headers.get('Retry-After')) > 0
  && blocked.headers.get('X-RateLimit-Remaining') === '0', blocked instanceof Response ? blocked.headers.get('Retry-After') ?? '' : 'no response')
check('still blocked while window is open', results[4] instanceof Response && (results[4] as Response).status === 429)

const otherKey = await limiter(fakeReq('10.0.0.2') as any, async () => null)
check('limits are per key — another caller is unaffected', !(otherKey instanceof Response))

// --- Part 3: route wiring is what the docs say -----------------------------------------

const routes = readFileSync('routes/api.ts', 'utf-8')
function tierBody(tier: string): string {
  const start = routes.indexOf(`route.group({ middleware: 'throttle:${tier}' }, () => {`)
  if (start === -1)
    return ''
  const end = routes.indexOf('})', start)
  return routes.slice(start, end)
}

const gameTier = tierBody('30,1')
check('claim + conquest sit in the 30/min game tier', gameTier.includes('/territories/claim')
  && gameTier.includes('/territories/process-conquest'))
const sweepTier = tierBody('10,1')
check('all four sweeps sit in the 10/min tier', ['/territories/recompute-ranks', '/territories/decay-sweep', '/maintenance/recompute-counters', '/achievements/evaluate']
  .every(p => sweepTier.includes(p)))
const socialTier = tierBody('60,1')
check('interactive writes sit in the 60/min tier', ['/activities', '/kudos', '/comments', '/reviews', '/follow', '/notifications/read']
  .every(p => socialTier.includes(p)))
const authGroupStart = routes.indexOf('route.group({ middleware: \'auth\' }')
check('throttle tiers nest inside the auth group', authGroupStart !== -1
  && authGroupStart < routes.indexOf('throttle:30,1')
  && routes.indexOf('/territories/claim\'', authGroupStart) > authGroupStart)

console.log(failures === 0 ? '\n✅ all rate-limit checks passed' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
