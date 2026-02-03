import type { Model } from '@stacksjs/types'
import { schema } from '@stacksjs/validation'

export default {
  name: 'Kudos',
  table: 'kudos',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'kudos',
      routes: ['index', 'store', 'destroy'],
    },
  },

  belongsTo: ['User', 'Activity'],

  attributes: {
    giverId: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: {
          required: 'Giver ID is required',
        },
      },
      factory: (faker) => faker.number.int({ min: 1, max: 100 }),
    },
  },
} satisfies Model
