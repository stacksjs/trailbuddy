import type { CLI } from '@stacksjs/types'
import process from 'node:process'
import { intro, log, outro } from '@stacksjs/cli'
import { defineModel } from '@stacksjs/orm'
import { ExitCode } from '@stacksjs/types'
import ActivityDefinition from '../Models/Activity'
import KudosDefinition from '../Models/Kudos'
import ReviewDefinition from '../Models/Review'
import TrailDefinition from '../Models/Trail'
import { computeCounterFixes } from '../../resources/functions/counters'

const Activity = defineModel(ActivityDefinition as any)
const Kudos = defineModel(KudosDefinition as any)
const Trail = defineModel(TrailDefinition as any)
const Review = defineModel(ReviewDefinition as any)

/**
 * `buddy counters:recompute` — rebuild every denormalized counter from its
 * source-of-truth rows (#973): activities.kudos_count from kudos, and
 * trails.rating/review_count from trail reviews.
 *
 * Write paths keep these in sync per-row (KudosToggleAction,
 * TrailReviewStoreAction); this command is the cron-able drift repair and the
 * on-demand CLI entry point. The math is shared with RecomputeCountersAction
 * via resources/functions/counters.ts.
 */
export default function (cli: CLI) {
  cli
    .command('counters:recompute', 'Recompute denormalized counters (kudos_count, trail rating/review_count)')
    .option('--dry-run', 'Preview without writing to database', { default: false })
    .alias('recompute:counters')
    .action(async (options: { dryRun: boolean }) => {
      const perf = await intro('buddy counters:recompute')

      const activities = ((await Activity.all()) ?? []) as any[]
      const kudos = ((await Kudos.all()) ?? []) as any[]
      const trails = ((await Trail.all()) ?? []) as any[]
      const reviews = ((await Review.all()) ?? []) as any[]

      const fixes = computeCounterFixes({ activities, kudos, trails, reviews })

      if (!fixes.activityFixes.length && !fixes.trailFixes.length) {
        log.info(`All counters already in sync (${activities.length} activities, ${trails.length} trails).`)
        await outro('Done', { startTime: perf, useSeconds: true })
        process.exit(ExitCode.Success)
      }

      for (const f of fixes.activityFixes) {
        console.log(`  activity ${f.id}: kudos_count → ${f.kudos_count}${options.dryRun ? ' (dry run)' : ''}`)
        if (!options.dryRun)
          await Activity.forceUpdate(f.id, { kudos_count: f.kudos_count })
      }
      for (const f of fixes.trailFixes) {
        console.log(`  trail ${f.id}: rating → ${f.rating}, review_count → ${f.review_count}${options.dryRun ? ' (dry run)' : ''}`)
        if (!options.dryRun)
          await Trail.forceUpdate(f.id, { rating: f.rating, review_count: f.review_count })
      }

      await outro(
        `Fixed ${fixes.activityFixes.length} activity counter(s), ${fixes.trailFixes.length} trail counter(s)${options.dryRun ? ' (dry run — nothing written)' : ''}`,
        { startTime: perf, useSeconds: true },
      )
      process.exit(ExitCode.Success)
    })
}
