import { pgTable, uuid, text, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { tasks } from './tasks'
import { standups } from './standups'
import { resources } from './resources'

export const taskHistoryTypeEnum = pgEnum('task_history_type', [
  'ai_created',       // initial extraction by AI from a standup
  'ai_updated',       // AI updated context from a subsequent standup
  'field_edited',     // human manually edited a field
  'assignee_added',   // a resource was assigned to this task
  'assignee_removed', // a resource was removed from this task
  'status_changed',   // task status was changed
  'deadline_extended',// deadline was pushed back (slippage event)
  'standup_mentioned',// task appeared in a standup with no other changes
  'context_learnt',   // new information surfaced about this task
])

export const taskHistory = pgTable('task_history', {
  id: uuid('id').primaryKey().defaultRandom(),

  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),

  // null = AI action; set = human action
  actorResourceId: uuid('actor_resource_id')
    .references(() => resources.id, { onDelete: 'set null' }),

  // 'AI' or the resource's name at the time of the change
  actorLabel: text('actor_label').notNull(),

  standupId: uuid('standup_id')
    .references(() => standups.id, { onDelete: 'set null' }),

  changeType: taskHistoryTypeEnum('change_type').notNull(),

  // Which field changed (null for creation / mention / context events)
  fieldName: text('field_name'),

  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),

  // Human-readable summary: "Deadline extended from 2026-05-20 to 2026-05-23"
  note: text('note'),

  // For ai_updated / context_learnt: what new was understood from today's standup
  learntContext: text('learnt_context'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
