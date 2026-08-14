import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'DevicePushToken',
  table: 'device_push_tokens',
  primaryKey: 'id',
  autoIncrement: true,
  traits: { useTimestamps: true },
  indexes: [
    { name: 'device_push_tokens_token_unique', columns: ['token'], unique: true },
    { name: 'device_push_tokens_user_id_index', columns: ['user_id'] },
  ],
  attributes: {
    user_id: { fillable: true, validation: { rule: schema.number().required() } },
    token: { fillable: true, validation: { rule: schema.string().required().max(4096) } },
    platform: { fillable: true, validation: { rule: schema.enum(['ios', 'android'] as const).required() } },
    device_id: { fillable: true, nullable: true, validation: { rule: schema.string().max(255) } },
    environment: { fillable: true, validation: { rule: schema.enum(['development', 'production'] as const).required() } },
    last_seen_at: { fillable: true, validation: { rule: schema.string().required() } },
  },
})
