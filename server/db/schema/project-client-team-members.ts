import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { standups } from './standups'

export const projectClientTeamMembers = pgTable(
  'project_client_team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    inferredRole: text('inferred_role'),
    firstMentionedStandupId: uuid('first_mentioned_standup_id').references(() => standups.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.projectId, table.name)]
)
