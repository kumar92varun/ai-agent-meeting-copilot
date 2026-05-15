import { pgTable, uuid, text, date, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { resources } from './resources'

export const extractionStatusEnum = pgEnum('extraction_status', [
  'pending',
  'analyzing',
  'reviewed',
  'saved',
  'failed',
])

export const standups = pgTable('project_standups', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),
  standupDate: date('standup_date').notNull(),
  rawTranscript: text('raw_transcript').notNull(),
  ingestedByUserId: uuid('ingested_by_user_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'restrict' }),
  extractionStatus: extractionStatusEnum('extraction_status').notNull().default('pending'),
  llmModelUsed: text('llm_model_used'),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  processingDurationMs: integer('processing_duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
