import type { CLI } from '@stacksjs/types'
import process from 'node:process'
import { intro, log, outro } from '@stacksjs/cli'
import { defineModel } from '@stacksjs/orm'
import { ExitCode } from '@stacksjs/types'
import TerritoryHistoryDefinition from '../Models/TerritoryHistory'
import TerritoryStatsDefinition from '../Models/TerritoryStats'
import { computeTerritoryRankAssignments } from '../../resources/functions/ranks'

const TerritoryStats = defineModel(TerritoryStatsDefinition as any)
const TerritoryHistory = defineModel(TerritoryHistoryDefinition as any)

/**
 * `buddy territory:ranks` — recompute weekly + all-time territory leaderboard
 * ranks and persist them to territory_stats (#944).
 *
 * Ranks are also refreshed automatically after every claim/conquest, so this
 * command is the cron-able safety net (e.g. `0 * * * * ./buddy territory:ranks`)
 * and the on-demand CLI entry point. The ranking math is shared with the
 * ComputeTerritoryRanksAction via resources/functions/ranks.ts.
 */
export default function (cli: CLI) {
  cli
    .command('territory:ranks', 'Recompute weekly + all-time territory leaderboard ranks')
    .option('--dry-run', 'Preview without writing to database', { default: false })
    .alias('ranks:territory')
    .action(async (options: { dryRun: boolean }) => {
      const perf = await intro('buddy territory:ranks')

      const stats = ((await TerritoryStats.all()) ?? []) as any[]
      if (!stats.length) {
        log.info('No territory_stats rows — nothing to rank.')
        await outro('Done', { startTime: perf, useSeconds: true })
        process.exit(ExitCode.Success)
      }

      const gainEvents = ((await TerritoryHistory
        .whereIn('event_type', ['claimed', 'conquered'])
        .get()) ?? []) as any[]

      const assignments = computeTerritoryRankAssignments(stats, gainEvents)

      let updated = 0
      for (const a of assignments) {
        const current = stats.find(s => s.id === a.id)
        const changed = !current
          || current.weekly_rank !== a.weekly_rank
          || current.all_time_rank !== a.all_time_rank
        const marker = changed ? '→' : '='
        console.log(`  user ${a.user_id}: all-time #${a.all_time_rank}, weekly #${a.weekly_rank} ${marker}${options.dryRun && changed ? ' (dry run)' : ''}`)
        if (!changed || options.dryRun)
          continue
        await TerritoryStats.forceUpdate(a.id, {
          weekly_rank: a.weekly_rank,
          all_time_rank: a.all_time_rank,
        })
        updated++
      }

      await outro(`Ranked ${assignments.length} user(s), updated ${updated}`, {
        startTime: perf,
        useSeconds: true,
      })
      process.exit(ExitCode.Success)
    })
}
