import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

// 'contested' = an attack that wasn't enough to take land (graze / sliver cut);
// it flips the territory to status 'contested' until defended or conquered.
// 'expired' = the territory decayed away after prolonged owner inactivity (#950).
const eventTypes = ['claimed', 'conquered', 'split', 'defended', 'contested', 'expired'] as const

export default defineModel({
  name: 'TerritoryHistory',
  table: 'territory_histories',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'territory-histories',
      routes: ['index', 'show'],
    },
  },

  belongsTo: ['Territory', 'User', 'Activity'],

  attributes: {
    territory_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

    user_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

    activity_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

    previous_owner_id: {
      order: 1,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number(),
      },
      factory: (faker) => faker.datatype.boolean() ? faker.number.int({ min: 1, max: 100 }) : null,
    },

    event_type: {
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

    area_at_event: {
      order: 3,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.float().min(0),
      },
      factory: (faker) => faker.number.float({ min: 1000, max: 500000, fractionDigits: 2 }),
    },

    previous_ownership_duration: {
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

    new_territory_id: {
      order: 6,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.number(),
      },
      factory: () => null,
    },
  },
})
