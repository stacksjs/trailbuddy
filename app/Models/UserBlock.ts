import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'UserBlock',
  table: 'user_blocks',
  primaryKey: 'id',
  autoIncrement: true,
  traits: { useTimestamps: true },
  indexes: [
    { name: 'user_blocks_pair_unique', columns: ['blocker_id', 'blocked_id'], unique: true },
  ],
  attributes: {
    blocker_id: { fillable: true, validation: { rule: schema.number().required() } },
    blocked_id: { fillable: true, validation: { rule: schema.number().required() } },
  },
} as const)
