import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

const statuses = ['pending', 'running', 'done', 'failed'] as const
const sources = ['osm', 'usfs', 'nps'] as const

/**
 * One unit of trail-ingest work, and its outcome.
 *
 * Building a national trail catalog is a job measured in days, not minutes:
 * ~1,400 Overpass tiles at two requests a minute, plus 466 federal shards. It
 * will be interrupted — by a deploy, an upstream outage, a restart — and it
 * must resume exactly where it stopped rather than starting the country again.
 *
 * That state cannot live in memory, so it lives here: every shard is a row,
 * the worker claims the oldest `pending` one, and a crash mid-shard leaves a
 * `running` row that the next pass reclaims. The counts on each row are also
 * the only honest answer to "how far along is this?", which is why the CLI and
 * the worker's status endpoint both read straight from this table.
 */
export default defineModel({
  name: 'TrailIngestShard',
  table: 'trail_ingest_shards',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
  },

  indexes: [
    // Shards are enumerated deterministically and re-seeded on every boot, so
    // this is what makes "seed if absent" a single idempotent statement.
    { name: 'trail_ingest_shards_key_unique', columns: ['shard_key'], unique: true },
    // The worker's hot query: oldest pending shard for a source.
    { name: 'trail_ingest_shards_source_status_index', columns: ['source', 'status'] },
  ],

  attributes: {
    /** Stable identifier, e.g. `osm:39,-106` or `usfs:0110`. Unique across sources. */
    shardKey: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.string().required().max(120),
        message: {
          required: 'Shard key is required',
        },
      },
      factory: faker => `osm:${faker.number.int({ min: 24, max: 49 })},${faker.number.int({ min: -125, max: -66 })}`,
    },

    source: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.enum(sources).required(),
        message: {
          required: 'Source is required',
        },
      },
      factory: (faker): typeof sources[number] => faker.helpers.arrayElement([...sources]),
    },

    /**
     * The source-specific cursor as JSON — a bounding box for OSM, a forest or
     * park code for the federal layers. Opaque to everything but its own
     * adapter, which is what keeps this table source-agnostic.
     */
    cursor: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: () => '{}',
    },

    status: {
      order: 4,
      fillable: true,
      default: 'pending',
      validation: {
        rule: schema.enum(statuses).required(),
        message: {
          required: 'Status is required',
        },
      },
      factory: (): typeof statuses[number] => 'pending',
    },

    /** Failed attempts so far. A shard is retired after too many. */
    attempts: {
      order: 5,
      fillable: true,
      default: 0,
      validation: {
        rule: schema.number().min(0),
      },
      factory: () => 0,
    },

    /** Features returned upstream, before normalization dropped any. */
    featuresSeen: {
      order: 6,
      fillable: true,
      default: 0,
      validation: {
        rule: schema.number().min(0),
      },
      factory: () => 0,
    },

    trailsImported: {
      order: 7,
      fillable: true,
      default: 0,
      validation: {
        rule: schema.number().min(0),
      },
      factory: () => 0,
    },

    trailsUpdated: {
      order: 8,
      fillable: true,
      default: 0,
      validation: {
        rule: schema.number().min(0),
      },
      factory: () => 0,
    },

    /** Last failure message, kept so a stuck shard can be diagnosed without logs. */
    lastError: {
      order: 9,
      fillable: true,
      validation: {
        rule: schema.string().max(1000),
      },
      factory: () => '',
    },

    startedAt: {
      order: 10,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: () => '',
    },

    completedAt: {
      order: 11,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: () => '',
    },
  },

  dashboard: {
    highlight: false,
  },
})
