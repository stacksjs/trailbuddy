import type { Model } from '@stacksjs/types'
import { schema } from '@stacksjs/validation'

export default {
  name: 'TerritoryHistory',
  table: 'territory_histories',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useSeeder: {
      count: 100,
    },
    useApi: {
      uri: 'territory-histories',
      routes: ['index', 'show'],
    },
  },

  belongsTo: ['Territory', 'User', 'Activity'],

  attributes: {
    // Previous owner ID (null for first claim)
    previousOwnerId: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
      factory: (faker) => faker.datatype.boolean() ? faker.number.int({ min: 1, max: 100 }) : null,
    },

    // Type of event: 'claimed', 'conquered', 'split', 'defended'
    eventType: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.string().required(),
        message: {
          required: 'Event type is required',
        },
      },
      factory: (faker) => faker.helpers.arrayElement(['claimed', 'conquered', 'split', 'defended']),
    },

    // Area at time of event (territories can be split)
    areaAtEvent: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.float({ min: 1000, max: 500000, fractionDigits: 2 }),
    },

    // Duration of previous ownership in seconds
    previousOwnershipDuration: {
      order: 4,
      fillable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 3600, max: 2592000 }), // 1 hour to 30 days in seconds
    },

    // Optional notes about the event
    notes: {
      order: 5,
      fillable: true,
      validation: {
        rule: schema.string().max(500),
      },
      factory: (faker) => faker.lorem.sentence(),
    },

    // For split events, reference to the new territory created from the split
    newTerritoryId: {
      order: 6,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
      factory: () => null,
    },
  },
} satisfies Model
