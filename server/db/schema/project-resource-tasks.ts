import { pgTable, uuid, text, integer, real, date, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { tasks } from './tasks'
import { resources } from './resources'
import { projects } from './projects'

export const aiEstimateConfidenceEnum = pgEnum('ai_estimate_confidence', ['low', 'medium', 'high'])
export const commitmentConfidenceEnum = pgEnum('commitment_confidence', [
  'firm',
  'vague',
  'aspirational',
])

export const projectResourceTasks = pgTable('project_resource_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'restrict' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  resourceEstimatedHours: real('resource_estimated_hours'),
  aiEstimatedHoursMin: real('ai_estimated_hours_min'),
  aiEstimatedHoursMax: real('ai_estimated_hours_max'),
  aiEstimateConfidence: aiEstimateConfidenceEnum('ai_estimate_confidence'),
  aiEstimateReasoning: text('ai_estimate_reasoning'),
  originalDeadlinePhrase: text('original_deadline_phrase'),
  resolvedDeadlineDate: date('resolved_deadline_date'),
  commitmentConfidence: commitmentConfidenceEnum('commitment_confidence'),
  timesDeadlineExtended: integer('times_deadline_extended').notNull().default(0),
  totalDaysSlipped: integer('total_days_slipped').notNull().default(0),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
