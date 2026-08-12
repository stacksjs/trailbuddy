import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'UserPrivacySetting',
  table: 'user_privacy_settings',
  primaryKey: 'id',
  autoIncrement: true,
  traits: { useTimestamps: true },
  belongsTo: ['User'],
  indexes: [
    { name: 'privacy_settings_user_unique', columns: ['user_id'], unique: true },
  ],
  attributes: {
    user_id: { fillable: true, validation: { rule: schema.number().required() } },
    default_activity_visibility: {
      fillable: true,
      validation: { rule: schema.enum(['public', 'followers', 'private']).required() },
      factory: () => 'followers',
    },
    hide_start_end_meters: { fillable: true, validation: { rule: schema.number().min(0).max(5000) }, factory: () => 400 },
    home_lat: { fillable: true, nullable: true, validation: { rule: schema.float().min(-90).max(90) }, factory: () => null },
    home_lng: { fillable: true, nullable: true, validation: { rule: schema.float().min(-180).max(180) }, factory: () => null },
    home_radius_meters: { fillable: true, validation: { rule: schema.number().min(100).max(5000) }, factory: () => 500 },
    exclude_home_from_game: { fillable: true, validation: { rule: schema.boolean() }, factory: () => true },
    show_precise_territories: { fillable: true, validation: { rule: schema.boolean() }, factory: () => false },
  },
} as const)
