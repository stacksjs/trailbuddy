import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

// Join table for club membership (#964): one row per (club, user). FK columns
// are plain fillable attrs (no belongsTo inline FK). A composite unique index
// (#972) makes a duplicate join resolve to "already a member".

const roles = ['owner', 'admin', 'member'] as const

export default defineModel({
  name: 'ClubMember',
  table: 'club_members',
  primaryKey: 'id',
  autoIncrement: true,

  traits: {
    useUuid: true,
    useTimestamps: true,
    useApi: {
      uri: 'club-members',
      routes: ['index', 'store', 'destroy'],
    },
  },

  indexes: [
    { name: 'club_members_club_user_unique', columns: ['club_id', 'user_id'], unique: true },
  ],

  attributes: {
    club_id: {
      order: 0,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'Club ID is required' },
      },
    },

    user_id: {
      order: 1,
      fillable: true,
      validation: {
        rule: schema.number().required(),
        message: { required: 'User ID is required' },
      },
    },

    role: {
      order: 2,
      fillable: true,
      validation: {
        rule: schema.enum(roles).required(),
      },
      factory: (): typeof roles[number] => 'member',
    },
  },
})
