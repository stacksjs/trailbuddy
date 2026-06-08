import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

// NOTE: the ORM is snake_case — attribute KEYS must be the column names, and
// belongsTo FK columns must be declared as fillable attributes to persist.

export default defineModel({
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
    // The user giving kudos.
    giver_id: {
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

    // The activity owner (denormalized for "kudos received" lookups).
    user_id: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

    // The activity that received the kudos.
    activity_id: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },
  },
})
