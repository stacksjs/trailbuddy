import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'TerritoryStats',
  table: 'territory_stats',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'territory-stats',
      routes: ['index', 'show'],
    },
  },

  belongsTo: ['User'],

  // Exactly one stats row per user (#972) — a duplicate would corrupt the
  // leaderboards.
  indexes: [
    { name: 'territory_stats_user_unique', columns: ['user_id'], unique: true },
  ],

  attributes: {
    user_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

    // Current number of territories owned
    total_territories_owned: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 20 }),
    },

    // Total area owned in square meters
    total_area_owned: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.float().min(0),
      },
      factory: (faker) => faker.number.float({ min: 0, max: 5000000, fractionDigits: 2 }),
    },

    // Lifetime territories claimed (including lost ones)
    territories_claimed: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 50 }),
    },

    // Lifetime territories conquered from others
    territories_conquered: {
      order: 4,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 30 }),
    },

    // Lifetime territories lost to others
    territories_lost: {
      order: 5,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 20 }),
    },

    // Times user successfully defended
    territories_defended: {
      order: 6,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 15 }),
    },

    // Longest time holding a single territory in days
    longest_ownership_days: {
      order: 7,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 180 }),
    },

    // Largest territory ever owned in square meters
    largest_territory_area: {
      order: 8,
      fillable: true,
      validation: {
        rule: schema.float().min(0),
      },
      factory: (faker) => faker.number.float({ min: 0, max: 500000, fractionDigits: 2 }),
    },

    // Current weekly leaderboard rank
    weekly_rank: {
      order: 9,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number().min(1),
      },
      factory: (faker) => faker.number.int({ min: 1, max: 500 }),
    },

    // All-time leaderboard rank
    all_time_rank: {
      order: 10,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number().min(1),
      },
      factory: (faker) => faker.number.int({ min: 1, max: 500 }),
    },
  },
})
