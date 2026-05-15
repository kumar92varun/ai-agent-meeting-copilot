import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { resources } from './resources'
import { standups } from './standups'

export const riskTypeEnum = pgEnum('risk_type', ['project', 'resource'])
export const riskCategoryEnum = pgEnum('risk_category', [
  'missed_deadline',
  'frequent_slippage',
  'low_attendance',
  'vague_updates',
  'blocker_unresolved',
  'estimate_mismatch',
  'vague_commitment',
  'other',
])
export const riskSeverityEnum = pgEnum('risk_severity', ['low', 'medium', 'high', 'critical'])
export const riskStatusEnum = pgEnum('risk_status', ['open', 'acknowledged', 'resolved'])

export const risks = pgTable('project_risks', {
  id: uuid('id').primaryKey().defaultRandom(),
  riskType: riskTypeEnum('risk_type').notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'set null' }),
  category: riskCategoryEnum('category').notNull(),
  severity: riskSeverityEnum('severity').notNull().default('medium'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  aiReasoning: text('ai_reasoning').notNull(),
  sourceStandupId: uuid('source_standup_id').references(() => standups.id, { onDelete: 'set null' }),
  sourceRawQuote: text('source_raw_quote'),
  status: riskStatusEnum('status').notNull().default('open'),
  acknowledgedBy: uuid('acknowledged_by').references(() => resources.id, { onDelete: 'set null' }),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
