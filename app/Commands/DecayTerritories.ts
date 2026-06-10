import type { CLI } from '@stacksjs/types'
import process from 'node:process'
import { intro, log, outro } from '@stacksjs/cli'
import { defineModel } from '@stacksjs/orm'
import { ExitCode } from '@stacksjs/types'
import TerritoryDefinition from '../Models/Territory'
import { computeTerritoryDecay, DECAY_EXPIRE_DAYS, DECAY_STALE_DAYS, territoryFreshnessMs } from '../../resources/functions/decay'

const Territory = defineModel(TerritoryDefinition as any)

/**
 * `buddy territory:decay` — preview or apply territory decay (#950).
 *
 * Decay also runs opportunistically on every conquest-processing pass, so this
 * command is the cron-able safety net for quiet periods (e.g.
 * `0 3 * * * ./buddy territory:decay --apply`) and the inspection tool.
 *
 * NOTE: --apply here only flips statuses (the world tick). The full
 * bookkeeping path — history rows, stats, notifications — lives in
 * DecayTerritoriesAction and runs server-side on the next conquest pass or
 * via POST /api/territories/decay-sweep; prefer that endpoint when the API
 * is up. Default is a dry-run preview.
 */
export default function (cli: CLI) {
  cli
    .command('territory:decay', 'Preview/apply territory decay (stale → contested, abandoned → expired)')
    .option('--apply', 'Apply status changes (default: preview only)', { default: false })
    .option('--stale-days [days]', 'Days of owner inactivity before contesting', { default: DECAY_STALE_DAYS })
    .option('--expire-days [days]', 'Days of owner inactivity before expiring', { default: DECAY_EXPIRE_DAYS })
    .action(async (options: { apply: boolean, staleDays: number, expireDays: number }) => {
      const perf = await intro('buddy territory:decay')

      const territories = ((await Territory.whereIn('status', ['active', 'contested']).get()) ?? []) as any[]
      const plan = computeTerritoryDecay(territories, {
        staleDays: Number(options.staleDays) || DECAY_STALE_DAYS,
        expireDays: Number(options.expireDays) || DECAY_EXPIRE_DAYS,
      })

      const describe = (t: any) => {
        const days = Math.floor((Date.now() - territoryFreshnessMs(t)) / 86400000)
        return `#${t.id} "${t.name}" (owner ${t.user_id}, inactive ${days}d)`
      }

      for (const t of plan.toContest)
        console.log(`  contest: ${describe(t)}`)
      for (const t of plan.toExpire)
        console.log(`  expire:  ${describe(t)}`)

      if (!plan.toContest.length && !plan.toExpire.length)
        log.info('Nothing to decay — all territories fresh.')

      if (options.apply) {
        for (const t of plan.toContest)
          await Territory.forceUpdate(t.id, { status: 'contested' })
        for (const t of plan.toExpire)
          await Territory.forceUpdate(t.id, { status: 'expired' })
      }
      else if (plan.toContest.length || plan.toExpire.length) {
        log.info('Preview only — re-run with --apply, or POST /api/territories/decay-sweep for full bookkeeping.')
      }

      await outro(`${plan.toContest.length} to contest, ${plan.toExpire.length} to expire${options.apply ? ' (applied)' : ' (preview)'}`, {
        startTime: perf,
        useSeconds: true,
      })
      process.exit(ExitCode.Success)
    })
}
