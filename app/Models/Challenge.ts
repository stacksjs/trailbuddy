import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

// A challenge: one athlete (challenger) stakes a duel over another's territory
// (#965). The ORM is snake_case; the challenger/challenged/territory/winner FKs
// are plain fillable attrs (no belongsTo inline FK - breaks SQLite
// migrate:fresh ordering). Lifecycle: pending → active (accepted) | declined;
// active → completed (resolved, with a winner_id).

const statuses = ['pending', 'active', 'completed', 'declined'] as const

export default defineModel({
  name: 'Challenge',
  table: 'challenges',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'challenges',
      routes: ['index', 'show', 'store', 'destroy'],
    },
  },

  attributes: {
    challenger_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Challenger ID is required' },
      },
    },

    challenged_id: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Challenged ID is required' },
      },
    },

    territory_id: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Territory ID is required' },
      },
    },

    area_at_stake: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.float().min(0),
      },
      factory: faker => faker.number.int({ min: 20000, max: 80000 }),
    },

    status: {
      order: 4,
      fillable: true,
      validation: {
        rule: schema.enum(statuses).required(),
      },
      factory: (): typeof statuses[number] => 'pending',
    },

    winner_id: {
      order: 5,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number(),
      },
      factory: () => null,
    },

    deadline: {
      order: 6,
      fillable: true,
      validation: {
        rule: schema.string(),
      },
      factory: faker => faker.date.soon({ days: 7 }).toISOString(),
    },
  },

  dashboard: {
    highlight: true,
  },
})
