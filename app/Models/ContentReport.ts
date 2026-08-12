import { defineModel } from '@stacksjs/orm'
import { schema } from '@stacksjs/validation'

export default defineModel({
  name: 'ContentReport',
  table: 'content_reports',
  primaryKey: 'id',
  autoIncrement: true,
  traits: { useTimestamps: true },
  indexes: [
    { name: 'content_reports_duplicate_unique', columns: ['reporter_id', 'subject_type', 'subject_id', 'reason'], unique: true },
    { name: 'content_reports_status_created_index', columns: ['status', 'created_at'] },
  ],
  attributes: {
    reporter_id: { fillable: true, validation: { rule: schema.number().required() } },
    subject_type: { fillable: true, validation: { rule: schema.enum(['user', 'activity', 'comment', 'trail_review', 'territory']).required() } },
    subject_id: { fillable: true, validation: { rule: schema.number().required() } },
    reason: { fillable: true, validation: { rule: schema.enum(['harassment', 'spam', 'unsafe', 'cheating', 'privacy', 'other']).required() } },
    details: { fillable: true, nullable: true, validation: { rule: schema.string().max(2000) }, factory: () => null },
    status: { fillable: true, validation: { rule: schema.enum(['open', 'reviewing', 'resolved', 'dismissed']).required() }, factory: () => 'open' },
    resolved_by: { fillable: true, nullable: true, validation: { rule: schema.number() }, factory: () => null },
    resolution_notes: { fillable: true, nullable: true, validation: { rule: schema.string().max(2000) }, factory: () => null },
  },
} as const)
