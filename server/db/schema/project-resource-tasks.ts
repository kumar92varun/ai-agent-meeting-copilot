import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core'
import { tasks } from './tasks'
import { resources } from './resources'
import { projects } from './projects'
import { standups } from './standups'

// Pure assignment table — which resource(s) are assigned to which task.
// All task-level data (deadline, hours, confidence, etc.) lives on project_tasks.
export const projectResourceTasks = pgTable(
  'project_resource_tasks',
  {
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
    addedByStandupId: uuid('added_by_standup_id')
      .references(() => standups.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [unique().on(table.taskId, table.resourceId)]
)
