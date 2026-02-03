import type { Model } from '@stacksjs/types'
import { schema } from '@stacksjs/validation'

export default {
  name: 'SavedTrail',
  table: 'saved_trails',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'saved-trails',
      routes: ['index', 'store', 'destroy'],
    },
  },

  belongsTo: ['User', 'Trail'],

  attributes: {
    notes: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.string().max(500),
      },
      factory: (faker) => faker.lorem.sentence(),
    },

    wantToVisit: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.boolean(),
      },
      factory: (faker) => faker.datatype.boolean(),
    },

    hasVisited: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.boolean(),
      },
      factory: (faker) => faker.datatype.boolean(),
    },
  },
} satisfies Model
