import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

/**
 * One completed yard by one runner — the unit of record for a backyard ultra,
 * and the thing the live page streams.
 *
 * The (event, user, yard) unique index is what makes lap reporting safe to
 * retry: the recorder queues laps while offline and replays them when signal
 * returns, and a duplicate must resolve to "already recorded" rather than
 * inflating somebody's count.
 */

export default defineModel({
  name: 'EventLap',
  table: 'event_laps',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
  },

  indexes: [
    { name: 'event_laps_event_user_yard_unique', columns: ['event_id', 'user_id', 'yard_number'], unique: true },
    { name: 'event_laps_event_finished_index', columns: ['event_id', 'finished_at'] },
  ],

  attributes: {
    event_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Event ID is required' },
      },
    },

    user_id: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'User ID is required' },
      },
    },

    /** 1-based. Yard 1 starts at the event's `start_time`. */
    yard_number: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.number().required().min(1).max(1000),
        message: { required: 'A yard number is required' },
      },
      factory: () => 1,
    },

    started_at: {
      order: 3,
      fillable: true,
      nullable: true,
      validation: { rule: schema.string().max(40) },
    },

    finished_at: {
      order: 4,
      fillable: true,
      validation: {
        rule: schema.string().required().max(40),
        message: { required: 'A finish time is required' },
      },
    },

    /** Seconds taken. What is left of the yard is the runner's rest. */
    duration_seconds: {
      order: 5,
      fillable: true,
      validation: { rule: schema.number().min(1).max(86400) },
      factory: () => 3000,
    },

    /** Miles actually covered, which is not always the nominal loop distance. */
    distance: {
      order: 6,
      fillable: true,
      nullable: true,
      validation: { rule: schema.float().min(0) },
    },

    /** The recorded activity this lap came from, when there is one. */
    activity_id: {
      order: 7,
      fillable: true,
      nullable: true,
      validation: { rule: schema.number() },
    },

    /** How the lap reached us: the recorder, the host's console, or an import. */
    source: {
      order: 8,
      fillable: true,
      validation: { rule: schema.enum(['recorder', 'manual', 'import'] as const).required() },
      factory: (): 'recorder' | 'manual' | 'import' => 'recorder',
    },
  },
})
