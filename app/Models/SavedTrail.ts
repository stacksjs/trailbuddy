import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
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

  // A trail can only be saved once per user (#972).
  indexes: [
    { name: 'saved_trails_user_trail_unique', columns: ['user_id', 'trail_id'], unique: true },
  ],

  attributes: {
    notes: {
      order: 1,
      fillable: true,
      nullable: true,
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
})
