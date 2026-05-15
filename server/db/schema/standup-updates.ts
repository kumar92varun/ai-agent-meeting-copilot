import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { standups } from './standups'
import { resources } from './resources'

export const standupUpdates = pgTable('project_standup_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  standupId: uuid('standup_id')
    .notNull()
    .references(() => standups.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'restrict' }),
  attended: boolean('attended').notNull().default(false),
  completedYesterdaySummary: text('completed_yesterday_summary'),
  workingTodaySummary: text('working_today_summary'),
  committedTaskIds: uuid('committed_task_ids').array().notNull().default([]),
  completedTaskIds: uuid('completed_task_ids').array().notNull().default([]),
  missedTaskIds: uuid('missed_task_ids').array().notNull().default([]),
  rawQuote: text('raw_quote'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
