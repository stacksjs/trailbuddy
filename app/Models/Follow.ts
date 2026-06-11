import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

// Social graph edge: `follower_id` follows `following_id`. The ORM is
// snake_case, so attribute KEYS are the column names; FK columns are plain
// fillable attributes (no belongsTo, which would emit an inline FK that breaks
// the SQLite migrate:fresh ordering). Uniqueness of (follower_id, following_id)
// is enforced by a composite unique index (#972); the toggle action stays
// idempotent and treats a constraint conflict as "already following".

export default defineModel({
  name: 'Follow',
  table: 'follows',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'follows',
      routes: ['index', 'store', 'destroy'],
    },
  },

  indexes: [
    { name: 'follows_follower_following_unique', columns: ['follower_id', 'following_id'], unique: true },
  ],

  attributes: {
    follower_id: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Follower ID is required' },
      },
    },

    following_id: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Following ID is required' },
      },
    },
  },
})
