import process from 'node:process'
import { runScheduler, Schedule } from '@stacksjs/scheduler'

/**
 * The scheduler, as a deployable process.
 *
 * `app/Scheduler.ts` declares three jobs the game depends on — hourly
 * territory ranks, daily decay at 03:10 UTC, counter repair at 04:10 — and
 * nothing in production ran them. No site started a scheduler, and the
 * production server does not embed one, so ranks were whatever the last manual
 * `buddy territory:ranks` left behind, decay never ran at all, and the
 * behaviour documented in `docs/wildloop/game-rules.md` described a process
 * that did not exist.
 *
 * This is the process. It exists as a built entry rather than as
 * `start: './buddy schedule:run'` because ts-cloud writes
 * `ExecStart=/usr/local/bin/bun <start>`: pointing that at the `buddy` shell
 * script makes bun parse shell as JavaScript, which is how a site crash-loops
 * before it binds anything. Same reason `main`, `api` and `ingest` each build
 * a module first.
 */

const PORT = Number(process.env.PORT ?? 3052)
const HOST = process.env.HOST ?? '127.0.0.1'

const startedAt = new Date()

/**
 * A status page, on the port the site has to bind anyway.
 *
 * A `start` site needs a port, and a scheduler has nothing to serve — so the
 * port is spent on the one question worth asking of a scheduler you cannot
 * see: when does each job next run. Without it the only way to know the
 * process is alive and holding its schedule is to wait for an effect and
 * notice it happened.
 */
function status(): Response {
  let jobs: Array<{ name: string, pattern?: string, nextRun: Date | null, enabled: boolean }> = []
  try {
    jobs = Schedule.listJobs()
  }
  catch {
    // A scheduler that cannot describe itself is still a scheduler. Reporting
    // an empty list beats failing the health check and having systemd restart
    // a process that was running its jobs perfectly well.
  }

  return Response.json({
    ok: true,
    startedAt: startedAt.toISOString(),
    now: new Date().toISOString(),
    jobs: jobs.map(job => ({
      name: job.name,
      pattern: job.pattern ?? null,
      nextRun: job.nextRun ? job.nextRun.toISOString() : null,
      enabled: job.enabled,
    })),
  })
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  fetch: () => status(),
})

// Registers everything in `app/Scheduler.ts`, plus any rate-scheduled job
// files. The timers it creates are what keep this process alive.
await runScheduler()

console.warn(`[scheduler] running; status on http://${HOST}:${PORT}`)

/**
 * Drain on the way out.
 *
 * A decay sweep over every territory is not instant, and a counter repair
 * killed halfway leaves the counters it was repairing worse than it found
 * them. `gracefulShutdown` waits for whatever is in flight; the site's
 * `stopTimeout` in config/cloud.ts is what gives it the time to do so, since
 * systemd's default would SIGKILL it first.
 */
async function shutdown(signal: string): Promise<void> {
  console.warn(`[scheduler] ${signal} received; finishing in-flight jobs`)
  server.stop()
  try {
    await Schedule.gracefulShutdown()
  }
  catch (error) {
    console.error('[scheduler] shutdown failed:', error)
  }
  process.exit(0)
}

// SIGTERM is what systemd sends; SIGINT is what a terminal does.
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
