import { pgTable, uuid, text, integer, real, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { standups } from './standups'

export const llmCallLogs = pgTable('llm_call_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeName: text('node_name').notNull(),
  standupId: uuid('standup_id').references(() => standups.id, { onDelete: 'set null' }),
  model: text('model').notNull(),
  provider: text('provider').notNull(),
  prompt: jsonb('prompt').notNull(),
  response: jsonb('response').notNull(),
  tokensIn: integer('tokens_in').notNull().default(0),
  tokensOut: integer('tokens_out').notNull().default(0),
  costUsd: real('cost_usd'),
  durationMs: integer('duration_ms').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
