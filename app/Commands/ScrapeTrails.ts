import type { CLI } from '@stacksjs/types'
import process from 'node:process'
import { intro, log, outro } from '@stacksjs/cli'
import { defineModel } from '@stacksjs/orm'
import { ExitCode } from '@stacksjs/types'
import TrailDefinition from '../Models/Trail'

const Trail = defineModel(TrailDefinition as any)
import { deduplicateTrails } from '../../resources/functions/scraper/deduplication'
import { fetchTile } from '../../resources/functions/scraper/overpass-client'
import { generateTiles, getRegion, regions } from '../../resources/functions/scraper/region-definitions'
import { normalizeElement } from '../../resources/functions/scraper/trail-normalizer'

interface ScrapeOptions {
  region: string
  limit: number
  dryRun: boolean
  verbose: boolean
}

export default function (cli: CLI) {
  cli
    .command('scrape:trails', 'Scrape real trail data from OpenStreetMap')
    .option('--region <region>', `Region to scrape: ${Object.keys(regions).join(', ')}`, { default: 'us' })
    .option('--limit [limit]', 'Max trails to import (0 = unlimited)', { default: 0 })
    .option('--dry-run', 'Preview without writing to database', { default: false })
    .option('--verbose', 'Detailed output per trail', { default: false })
    .alias('trails:scrape')
    .action(async (options: ScrapeOptions) => {
      const perf = await intro('buddy scrape:trails')
      const limit = Number(options.limit) || 0

      let region
      try {
        region = getRegion(options.region)
      }
      catch (error) {
        log.error(error instanceof Error ? error.message : String(error))
        process.exit(ExitCode.FatalError)
      }

      const tiles = generateTiles(options.region)
      log.info(`Scraping trails from ${region.displayName} (${tiles.length} tiles)`)
      if (options.dryRun)
        log.info('Dry run mode — no database writes')
      if (limit > 0)
        log.info(`Limiting to ${limit} trails`)

      let totalImported = 0
      let totalSkipped = 0
      let totalErrors = 0

      // Load existing trails for dedup
      let existingTrails: Array<{ name: string, latitude: number, longitude: number }> = []
      if (!options.dryRun) {
        try {
          const allTrails = await Trail.all()
          if (allTrails) {
            existingTrails = allTrails.map((t: any) => ({
              name: t.name || '',
              latitude: Number(t.latitude) || 0,
              longitude: Number(t.longitude) || 0,
            }))
          }
          log.info(`Found ${existingTrails.length} existing trails for dedup`)
        }
        catch {
          log.warn('Could not load existing trails for dedup, proceeding without')
        }
      }

      for (const tile of tiles) {
        if (limit > 0 && totalImported >= limit)
          break

        log.info(`[tile ${tile.index + 1}/${tile.total}] Fetching...`)

        const elements = await fetchTile(tile, options.verbose)
        if (elements.length === 0) {
          if (options.verbose)
            log.info(`  No trails found in tile`)
          continue
        }

        // Normalize OSM elements to trail data
        const normalized = elements
          .map(el => normalizeElement(el, region.displayName))
          .filter((t): t is NonNullable<typeof t> => t !== null)

        if (normalized.length === 0) {
          if (options.verbose)
            log.info(`  No valid trails after normalization`)
          continue
        }

        // Dedup against existing + previously imported
        const { unique, duplicateCount } = deduplicateTrails(normalized, existingTrails)
        totalSkipped += duplicateCount

        // Apply limit
        let toImport = unique
        if (limit > 0) {
          const remaining = limit - totalImported
          toImport = unique.slice(0, remaining)
        }

        if (options.dryRun) {
          for (const trail of toImport) {
            console.log(`  [DRY RUN] ${trail.name} (${trail.distance} km, ${trail.difficulty}) @ ${trail.latitude},${trail.longitude}`)
          }
          totalImported += toImport.length
        }
        else {
          // Insert trails into database
          for (const trail of toImport) {
            try {
              await Trail.create({
                name: trail.name,
                location: trail.location,
                distance: trail.distance,
                elevation: trail.elevation,
                difficulty: trail.difficulty,
                rating: trail.rating,
                reviewCount: trail.reviewCount,
                estimatedTime: trail.estimatedTime,
                image: trail.image,
                tags: trail.tags,
                latitude: trail.latitude,
                longitude: trail.longitude,
                description: trail.description,
              })
              totalImported++

              // Add to existing trails for cross-tile dedup
              existingTrails.push({
                name: trail.name,
                latitude: trail.latitude,
                longitude: trail.longitude,
              })

              if (options.verbose)
                console.log(`  + ${trail.name} (${trail.distance} km, ${trail.difficulty})`)
            }
            catch (error) {
              totalErrors++
              if (options.verbose)
                log.warn(`  Failed to insert "${trail.name}": ${error instanceof Error ? error.message : error}`)
            }
          }
        }

        log.info(`[tile ${tile.index + 1}/${tile.total}] Imported ${toImport.length}, skipped ${duplicateCount} duplicates`)
      }

      console.log('')
      log.info(`--- Summary ---`)
      log.info(`  Imported: ${totalImported}`)
      log.info(`  Skipped (duplicates): ${totalSkipped}`)
      if (totalErrors > 0)
        log.warn(`  Errors: ${totalErrors}`)
      if (options.dryRun)
        log.info(`  (dry run — no data written)`)

      await outro(`Scraped ${totalImported} trails from ${region.displayName}`, {
        startTime: perf,
        useSeconds: true,
      })
      process.exit(ExitCode.Success)
    })

  cli.on('scrape:trails:*', () => {
    log.error('Invalid command: %s\nSee --help for a list of available commands.', cli.args.join(' '))
    process.exit(1)
  })
}
