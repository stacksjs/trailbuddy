import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

// A comment on an activity. Named ActivityComment / activity_comments to avoid
// colliding with the framework's default `Comment` model+table. The ORM is
// snake_case, so attribute KEYS are the column names; FK columns are declared as
// plain fillable attributes (no belongsTo, which would emit an inline FK that
// breaks the SQLite migrate:fresh ordering).

export default defineModel({
  name: 'ActivityComment',
  table: 'activity_comments',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'activity-comments',
      routes: ['index', 'store', 'destroy'],
    },
  },

  attributes: {
    user_id: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'User ID is required' },
      },
    },

    activity_id: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Activity ID is required' },
      },
    },

    body: {
      order: 3,
      fillable: true,
      validation: {
        rule: schema.string().required().min(1).max(2000),
        message: { required: 'Comment text is required' },
      },
      factory: faker => faker.lorem.sentence(),
    },
  },
})
