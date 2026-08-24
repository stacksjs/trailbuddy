import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

/**
 * One athlete's place in one event.
 *
 * `yards_completed` is denormalised from EventLap on purpose: the live board
 * is polled by every spectator watching, and re-counting laps per entrant on
 * each poll is the one query that would not survive a popular race. The lap
 * rows remain the source of truth — `EventLiveAction` recomputes from them
 * when a lap lands, and a recount can always rebuild this column.
 */

const statuses = ['registered', 'running', 'timed_out', 'withdrawn', 'dnf', 'winner'] as const

export default defineModel({
  name: 'EventEntrant',
  table: 'event_entrants',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
  },

  indexes: [
    { name: 'event_entrants_event_user_unique', columns: ['event_id', 'user_id'], unique: true },
    { name: 'event_entrants_event_yards_index', columns: ['event_id', 'yards_completed'] },
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

    bib: {
      order: 2,
      fillable: true,
      nullable: true,
      validation: { rule: schema.string().max(12) },
    },

    status: {
      order: 3,
      fillable: true,
      validation: { rule: schema.enum(statuses).required() },
      factory: (): typeof statuses[number] => 'registered',
    },

    yards_completed: {
      order: 4,
      fillable: true,
      validation: { rule: schema.number().min(0) },
      factory: () => 0,
    },

    /** ISO timestamp of the most recent completed yard. Drives "still in?". */
    last_lap_at: {
      order: 5,
      fillable: true,
      nullable: true,
      validation: { rule: schema.string().max(40) },
    },

    /** Why they stopped, in the runner's own words. Shown on the live board. */
    exit_note: {
      order: 6,
      fillable: true,
      nullable: true,
      validation: { rule: schema.string().max(200) },
    },
  },
})
