import { pgTable, uuid, text, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { standups } from './standups'
import { resources } from './resources'

export const attendanceSourceEnum = pgEnum('attendance_source', ['ai_inferred', 'human_confirmed'])

export const standupUpdates = pgTable('standup_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  standupId: uuid('standup_id')
    .notNull()
    .references(() => standups.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'restrict' }),
  attended: boolean('attended').notNull().default(false),
  attendanceSource: attendanceSourceEnum('attendance_source').notNull().default('ai_inferred'),
  completedYesterdaySummary: text('completed_yesterday_summary'),
  workingTodaySummary: text('working_today_summary'),
  committedTaskIds: uuid('committed_task_ids').array().notNull().default([]),
  completedTaskIds: uuid('completed_task_ids').array().notNull().default([]),
  missedTaskIds: uuid('missed_task_ids').array().notNull().default([]),
  rawQuote: text('raw_quote'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
