import type { Model } from '@stacksjs/types'
import { schema } from '@stacksjs/validation'

export default {
  name: 'TerritoryStats',
  table: 'territory_stats',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: {
      count: 20,
    },
    useApi: {
      uri: 'territory-stats',
      routes: ['index', 'show'],
    },
  },

  belongsTo: ['User'],

  attributes: {
    // Current number of territories owned
    totalTerritoriesOwned: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 20 }),
    },

    // Total area owned in square meters
    totalAreaOwned: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.float({ min: 0, max: 5000000, fractionDigits: 2 }),
    },

    // Lifetime territories claimed (including lost ones)
    territoriesClaimed: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 50 }),
    },

    // Lifetime territories conquered from others
    territoriesConquered: {
      order: 4,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 30 }),
    },

    // Lifetime territories lost to others
    territoriesLost: {
      order: 5,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 20 }),
    },

    // Times user successfully defended
    territoriesDefended: {
      order: 6,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 15 }),
    },

    // Longest time holding a single territory in days
    longestOwnershipDays: {
      order: 7,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 0, max: 180 }),
    },

    // Largest territory ever owned in square meters
    largestTerritoryArea: {
      order: 8,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.float({ min: 0, max: 500000, fractionDigits: 2 }),
    },

    // Current weekly leaderboard rank
    weeklyRank: {
      order: 9,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number().min(1),
      },
      factory: (faker) => faker.number.int({ min: 1, max: 500 }),
    },

    // All-time leaderboard rank
    allTimeRank: {
      order: 10,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number().min(1),
      },
      factory: (faker) => faker.number.int({ min: 1, max: 500 }),
    },
  },
} satisfies Model
