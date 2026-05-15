import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { resources } from './resources'
import { projects } from './projects'

export const projectLeads = pgTable(
  'project_leads',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })]
)
