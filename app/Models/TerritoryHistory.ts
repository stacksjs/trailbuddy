import type { Model } from '@stacksjs/types'
import { schema } from '@stacksjs/validation'

const eventTypes = ['claimed', 'conquered', 'split', 'defended'] as const

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
    previousOwnerId: {
      order: 1,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number(),
      },
      factory: (faker) => faker.datatype.boolean() ? faker.number.int({ min: 1, max: 100 }) : null,
    },

    eventType: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.enum(eventTypes).required(),
        message: {
          required: 'Event type is required',
        },
      },
      factory: (faker): typeof eventTypes[number] => faker.helpers.arrayElement([...eventTypes]),
    },

    areaAtEvent: {
      order: 3,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.float({ min: 1000, max: 500000, fractionDigits: 2 }),
    },

    previousOwnershipDuration: {
      order: 4,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number().min(0),
      },
      factory: (faker) => faker.number.int({ min: 3600, max: 2592000 }),
    },

    notes: {
      order: 5,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.string().max(500),
      },
      factory: (faker) => faker.lorem.sentence(),
    },

    newTerritoryId: {
      order: 6,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number(),
      },
      factory: () => null,
    },
  },
} satisfies Model
