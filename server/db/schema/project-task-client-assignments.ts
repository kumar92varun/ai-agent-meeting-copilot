import { pgTable, uuid, timestamp, pgEnum, unique } from 'drizzle-orm/pg-core'
import { tasks } from './tasks'
import { projectClientTeamMembers } from './project-client-team-members'
import { standups } from './standups'

export const taskClientAssignmentTypeEnum = pgEnum('task_client_assignment_type', [
  'assigned_by',  // client member explicitly told our resource to do this
  'mentioned_by', // client member was referenced in context of this task
  'reviewing',    // client member is expected to review or approve the output
])

export const projectTaskClientAssignments = pgTable(
  'project_task_client_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    clientMemberId: uuid('client_member_id')
      .notNull()
      .references(() => projectClientTeamMembers.id, { onDelete: 'cascade' }),
    assignmentType: taskClientAssignmentTypeEnum('assignment_type').notNull(),
    sourceStandupId: uuid('source_standup_id').references(() => standups.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.taskId, table.clientMemberId)]
)
