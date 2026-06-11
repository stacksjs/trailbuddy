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

  // An achievement can only be earned once per user (#972).
  indexes: [
    { name: 'user_achievements_user_achievement_unique', columns: ['user_id', 'achievement_id'], unique: true },
  ],

  attributes: {
    // FK columns declared explicitly so ORM writes persist them (snake_case
    // contract); the columns themselves already come from belongsTo.
    user_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

    achievement_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number(),
      },
    },

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

    completed_at: {
      order: 2,
      fillable: true,
      nullable: true,
      validation: {
        rule: schema.string(),
      },
      factory: (faker) => faker.datatype.boolean() ? faker.date.recent({ days: 90 }).toISOString() : null,
    },

    is_complete: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.boolean(),
      },
      factory: (faker) => faker.datatype.boolean(),
    },
  },
})
