import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'CustomRoute',
  table: 'custom_routes',
  primaryKey: 'id',
  autoIncrement: true,
  traits: { useTimestamps: true },
  belongsTo: ['User'],
  indexes: [
    { name: 'custom_routes_user_created_index', columns: ['user_id', 'created_at'] },
  ],
  attributes: {
    user_id: { fillable: true, validation: { rule: schema.number().required() } },
    name: { fillable: true, validation: { rule: schema.string().min(2).max(200).required() } },
    route_data: { fillable: true, validation: { rule: schema.string().required().max(2_000_000) } },
    distance: { fillable: true, validation: { rule: schema.float().min(0) }, factory: () => 0 },
    elevation: { fillable: true, validation: { rule: schema.float().min(0) }, factory: () => 0 },
    closed_loop: { fillable: true, validation: { rule: schema.boolean() }, factory: () => false },
  },
} as const)
