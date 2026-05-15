import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { standups } from './standups'

export const taskStatusEnum = pgEnum('task_status', [
  'committed',
  'in_progress',
  'completed',
  'overdue',
  'carried_over',
  'cancelled',
])

export const tasks = pgTable('project_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('committed'),
  firstMentionedStandupId: uuid('first_mentioned_standup_id').references(() => standups.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
