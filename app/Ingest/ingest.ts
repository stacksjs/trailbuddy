/**
 * The ingest engine: turns the source adapters into a national trail database
 * that keeps building itself.
 *
 * The unit of work is a shard (see `TrailIngestShard`), and the loop is
 * deliberately boring — claim the oldest pending shard, fetch it, upsert what
 * it returned, record the outcome, repeat. Everything interesting is in what
 * that boringness buys:
 *
 *  - **Resumability.** Progress is in the database, not in memory, so a deploy
 *    or a crash costs one shard rather than the whole run.
 *  - **Idempotency.** Writes go through a single upsert keyed on
 *    `(source, source_id)`, so re-running a shard refreshes rows instead of
 *    duplicating them. That is what makes a permanent re-sync cycle safe.
 *  - **Isolation.** One source failing (Overpass goes down for a day) does not
 *    stop the others; its shards simply fail, back off and get retried.
 */

import type { NormalizedTrail, TrailSource } from './types'
import { db } from '@stacksjs/orm'
import { getSource, sources } from './sources'

/** Rows per upsert statement. Large enough to amortise, small enough for SQLite's parameter cap. */
const WRITE_BATCH = 200

/** A shard that has failed this many times is parked rather than retried forever. */
const MAX_ATTEMPTS = 5

/**
 * How long a `running` shard may sit before it is assumed dead and reclaimed.
 *
 * Longer than the slowest legitimate shard: a dense Overpass tile can take
 * five minutes, and the retry ladder inside the HTTP client can stretch that
 * to twenty before it gives up.
 */
const STALE_RUNNING_MS = 45 * 60 * 1000

/**
 * A completed shard becomes eligible again after this long, which is what
 * turns a one-off import into a catalog that tracks upstream. Trails change
 * slowly; a month is frequent enough to catch reroutes and closures without
 * spending the whole year re-fetching.
 */
const RESYNC_AFTER_MS = 30 * 24 * 3600 * 1000

/** Columns refreshed when a trail already exists. */
const MERGE_COLUMNS = [
  'name',
  'location',
  'description',
  'distance',
  'elevation',
  'elevation_high',
  'difficulty',
  'route_type',
  'surface',
  'estimated_time',
  'geometry',
  'latitude',
  'longitude',
  'min_lat',
  'max_lat',
  'min_lng',
  'max_lng',
  'state',
  'state_name',
  'managed_by',
  'allowed_uses',
  'dogs_allowed',
  'wheelchair_accessible',
  'national_trail',
  'source_url',
  'synced_at',
  'updated_at',
  // Deliberately NOT merged: `image`, `tags`, `rating`, `review_count`. The
  // first two are presentation the app may later curate, and the ratings are
  // ours — they come from WildLoop users, not from upstream, and a re-sync
  // must never wipe them.
]

export interface ShardOutcome {
  key: string
  source: TrailSource
  seen: number
  imported: number
  updated: number
  durationMs: number
}

export interface IngestProgress {
  source: TrailSource
  pending: number
  running: number
  done: number
  failed: number
  total: number
  trails: number
}

/**
 * Ensure every shard of every source exists as a row.
 *
 * Safe to call on every boot: shard enumeration is deterministic, and the
 * insert ignores keys that are already there. New shards (a new park unit, a
 * new forest) therefore appear automatically without a migration.
 */
export async function seedShards(only?: TrailSource[]): Promise<number> {
  const wanted = only?.length ? sources.filter(source => only.includes(source.source)) : sources
  let created = 0

  for (const adapter of wanted) {
    const shards = await adapter.shards()
    const now = new Date().toISOString()

    for (let i = 0; i < shards.length; i += WRITE_BATCH) {
      const batch = shards.slice(i, i + WRITE_BATCH).map(shard => ({
        uuid: crypto.randomUUID(),
        shard_key: shard.key,
        source: shard.source,
        cursor: JSON.stringify(shard.cursor),
        status: 'pending',
        attempts: 0,
        features_seen: 0,
        trails_imported: 0,
        trails_updated: 0,
        created_at: now,
        updated_at: now,
      }))

      // `insertOrIgnore` rather than `upsert`: an existing shard carries
      // progress, and re-seeding must never reset it back to pending.
      await db.insertOrIgnore('trail_ingest_shards', batch)
    }

    created += shards.length
  }

  return created
}

interface ShardRow {
  id: number
  shard_key: string
  source: TrailSource
  cursor: string
  attempts: number
}

/**
 * Claim the next shard to work on, marking it `running` so a second worker
 * does not pick up the same one.
 *
 * Order of preference:
 *  1. shards that have never run,
 *  2. shards whose `running` claim has gone stale (a worker died),
 *  3. shards that failed and have attempts left,
 *  4. shards finished long enough ago to be worth re-syncing.
 *
 * The claim is a conditional UPDATE — it only succeeds if the row is still in
 * the state we read it in, so two workers racing on the same row cannot both
 * win.
 */
export async function claimShard(only?: TrailSource[]): Promise<ShardRow | null> {
  const now = Date.now()
  const staleBefore = new Date(now - STALE_RUNNING_MS).toISOString()
  const resyncBefore = new Date(now - RESYNC_AFTER_MS).toISOString()
  const sourceFilter = only?.length ? only : sources.map(source => source.source)

  const candidates = [
    { status: 'pending', where: 'status = \'pending\'' },
    { status: 'running', where: `status = 'running' AND (started_at IS NULL OR started_at < '${staleBefore}')` },
    { status: 'failed', where: `status = 'failed' AND attempts < ${MAX_ATTEMPTS}` },
    { status: 'done', where: `status = 'done' AND (completed_at IS NULL OR completed_at < '${resyncBefore}')` },
  ]

  const inList = sourceFilter.map(source => `'${source}'`).join(',')

  for (const candidate of candidates) {
    const rows = await db.sql`
      SELECT id, shard_key, source, cursor, attempts, status
      FROM trail_ingest_shards
      WHERE source IN (${db.unsafe(inList)}) AND (${db.unsafe(candidate.where)})
      ORDER BY id ASC
      LIMIT 1
    `.execute() as Array<ShardRow & { status: string }>

    const row = rows?.[0]
    if (!row)
      continue

    const claimed = await db.sql`
      UPDATE trail_ingest_shards
      SET status = 'running', started_at = ${new Date().toISOString()}, updated_at = ${new Date().toISOString()}
      WHERE id = ${row.id} AND status = ${row.status}
    `.execute()

    // Another worker won the race; fall through and look again.
    if (rowsAffected(claimed) === 0)
      continue

    return row
  }

  return null
}

/**
 * Drivers report affected rows differently (a number, a `{changes}` object, an
 * array). Anything we cannot read is treated as "claimed", because failing to
 * claim a shard we did claim would strand it in `running` until it went stale.
 */
function rowsAffected(result: unknown): number {
  if (typeof result === 'number')
    return result
  if (Array.isArray(result))
    return result.length || 1
  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>
    for (const key of ['changes', 'affectedRows', 'rowsAffected', 'count']) {
      if (typeof record[key] === 'number')
        return record[key] as number
    }
  }
  return 1
}

/** Fetch one shard, write what it returned, and record the outcome. */
export async function runShard(row: ShardRow): Promise<ShardOutcome> {
  const started = Date.now()
  const adapter = getSource(row.source)

  try {
    const result = await adapter.fetch({
      source: row.source,
      key: row.shard_key,
      cursor: JSON.parse(row.cursor || '{}'),
    })

    const { imported, updated } = await writeTrails(result.trails)
    const completedAt = new Date().toISOString()

    await db.sql`
      UPDATE trail_ingest_shards
      SET status = 'done',
          features_seen = ${result.seen},
          trails_imported = ${imported},
          trails_updated = ${updated},
          last_error = '',
          completed_at = ${completedAt},
          updated_at = ${completedAt}
      WHERE id = ${row.id}
    `.execute()

    return {
      key: row.shard_key,
      source: row.source,
      seen: result.seen,
      imported,
      updated,
      durationMs: Date.now() - started,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const now = new Date().toISOString()

    await db.sql`
      UPDATE trail_ingest_shards
      SET status = 'failed',
          attempts = attempts + 1,
          last_error = ${message.slice(0, 1000)},
          updated_at = ${now}
      WHERE id = ${row.id}
    `.execute()

    throw error
  }
}

/**
 * Upsert a shard's trails, and report how many were new.
 *
 * The "new vs updated" split needs a read: an upsert cannot say which branch
 * it took. One indexed `IN` query per batch against the unique
 * `(source, source_id)` index is cheap next to the network round trip that
 * produced the rows, and the numbers are what make the progress readout mean
 * anything.
 */
export async function writeTrails(trails: NormalizedTrail[]): Promise<{ imported: number, updated: number }> {
  if (trails.length === 0)
    return { imported: 0, updated: 0 }

  let imported = 0
  let updated = 0

  for (let i = 0; i < trails.length; i += WRITE_BATCH) {
    const batch = trails.slice(i, i + WRITE_BATCH)
    const now = new Date().toISOString()

    const ids = batch.map(trail => `'${trail.sourceId.replace(/'/g, '\'\'')}'`).join(',')
    const existingRows = await db.sql`
      SELECT source_id FROM trails
      WHERE source = ${batch[0].source} AND source_id IN (${db.unsafe(ids)})
    `.execute() as Array<{ source_id: string }>

    const existing = new Set((existingRows ?? []).map(row => row.source_id))

    const rows = batch.map(trail => ({
      uuid: crypto.randomUUID(),
      source: trail.source,
      source_id: trail.sourceId,
      source_url: trail.sourceUrl,
      synced_at: now,

      name: trail.name,
      location: trail.location,
      description: trail.description,

      latitude: trail.latitude,
      longitude: trail.longitude,
      min_lat: trail.minLat,
      max_lat: trail.maxLat,
      min_lng: trail.minLng,
      max_lng: trail.maxLng,
      state: trail.state,
      state_name: trail.stateName,
      managed_by: trail.managedBy,

      distance: trail.distance,
      elevation: trail.elevation,
      elevation_high: trail.elevationHigh,
      difficulty: trail.difficulty,
      route_type: trail.routeType,
      surface: trail.surface,
      estimated_time: trail.estimatedTime,
      geometry: trail.geometry,

      allowed_uses: trail.allowedUses,
      dogs_allowed: trail.dogsAllowed,
      wheelchair_accessible: trail.wheelchairAccessible,
      national_trail: trail.nationalTrail,

      image: trail.image,
      tags: trail.tags,
      rating: 0,
      review_count: 0,

      created_at: now,
      updated_at: now,
    }))

    await db.upsert('trails', rows, ['source', 'source_id'], MERGE_COLUMNS)

    for (const trail of batch) {
      if (existing.has(trail.sourceId))
        updated++
      else
        imported++
    }
  }

  return { imported, updated }
}

/** Per-source counts, for the CLI and the worker's status endpoint. */
export async function progress(): Promise<IngestProgress[]> {
  const shardRows = await db.sql`
    SELECT source, status, COUNT(*) AS count
    FROM trail_ingest_shards
    GROUP BY source, status
  `.execute() as Array<{ source: TrailSource, status: string, count: number }>

  const trailRows = await db.sql`
    SELECT source, COUNT(*) AS count FROM trails GROUP BY source
  `.execute() as Array<{ source: string, count: number }>

  const trailCounts = new Map(trailRows?.map(row => [row.source, Number(row.count)]))

  return sources.map((adapter) => {
    const rows = (shardRows ?? []).filter(row => row.source === adapter.source)
    const byStatus = (status: string) => Number(rows.find(row => row.status === status)?.count ?? 0)

    const pending = byStatus('pending')
    const running = byStatus('running')
    const done = byStatus('done')
    const failed = byStatus('failed')

    return {
      source: adapter.source,
      pending,
      running,
      done,
      failed,
      total: pending + running + done + failed,
      trails: trailCounts.get(adapter.source) ?? 0,
    }
  })
}

export interface IngestRunOptions {
  /** Restrict the run to these sources. Defaults to all of them. */
  only?: TrailSource[]
  /** Stop after this many shards. 0 runs until nothing is claimable. */
  maxShards?: number
  /** Called after each shard, for CLI output. */
  onShard?: (outcome: ShardOutcome) => void
  /** Called when a shard fails, so a long run can report without stopping. */
  onError?: (key: string, error: unknown) => void
  /**
   * Checked before every shard. The worker uses this to honour SIGTERM
   * promptly — without it, a deploy would wait out the rest of the batch,
   * which on Overpass is a quarter of an hour, and get SIGKILLed instead.
   */
  shouldStop?: () => boolean
}

/**
 * Work shards until the budget runs out or nothing is claimable.
 *
 * A failing shard is reported and skipped rather than thrown: over a run of a
 * thousand shards, some upstream request will fail, and stopping the country's
 * ingest because one Overpass tile timed out would be the wrong trade.
 */
export async function runIngest(options: IngestRunOptions = {}): Promise<ShardOutcome[]> {
  const outcomes: ShardOutcome[] = []
  const budget = options.maxShards ?? 0

  while (budget === 0 || outcomes.length < budget) {
    if (options.shouldStop?.())
      break

    const shard = await claimShard(options.only)
    if (!shard)
      break

    try {
      const outcome = await runShard(shard)
      outcomes.push(outcome)
      options.onShard?.(outcome)
    }
    catch (error) {
      options.onError?.(shard.shard_key, error)
    }
  }

  return outcomes
}
