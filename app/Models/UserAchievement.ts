import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'UserAchievement',
  table: 'user_achievements',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'user-achievements',
      routes: ['index', 'store', 'show'],
    },
  },

  belongsTo: ['User', 'Achievement'],

  attributes: {
    progress: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().required().min(0),
        message: {
          required: 'Progress is required',
        },
      },
      factory: (faker) => faker.number.int({ min: 0, max: 100 }),
    },

    completedAt: {
      order: 2,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.string(),
      },
      factory: (faker) => faker.datatype.boolean() ? faker.date.recent({ days: 90 }).toISOString() : null,
    },

    isComplete: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.boolean(),
      },
      factory: (faker) => faker.datatype.boolean(),
    },
  },
})
