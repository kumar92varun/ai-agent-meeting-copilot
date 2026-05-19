import { pgTable, uuid, text, boolean, integer, real, date, timestamp, pgEnum, jsonb } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { standups } from './standups'
import { resources } from './resources'

export const taskStatusEnum = pgEnum('task_status', [
  'committed',
  'in_progress',
  'completed',
  'overdue',
  'carried_over',
  'cancelled',
])

export const taskUpdateTypeEnum = pgEnum('task_update_type', [
  'completed',   // person reported this as done
  'committed',   // person committed to doing this
  'blocker',     // person flagged this as a blocker
])

export const taskPriorityEnum = pgEnum('task_priority', [
  'critical',
  'high',
  'medium',
  'low',
])

export const taskCategoryEnum = pgEnum('task_category', [
  'feature',
  'bug',
  'refactor',
  'testing',
  'review',
  'devops',
  'other',
])

export const taskComplexityEnum = pgEnum('task_complexity', [
  'simple',
  'medium',
  'complex',
])

export const targetEnvironmentEnum = pgEnum('target_environment', [
  'development',
  'staging',
  'production',
  'not_specified',
])

export const aiEstimateConfidenceEnum = pgEnum('ai_estimate_confidence', [
  'low',
  'medium',
  'high',
])

export const resourceTaskCompletionConfidenceEnum = pgEnum('resource_task_completion_confidence', [
  'completion_guaranteed',
  'high_probability',
  'no_guarantee',
])

export const tasks = pgTable('project_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),

  // ── Core identity ────────────────────────────────────────────────
  title: text('title').notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('committed'),
  taskUpdateType: taskUpdateTypeEnum('task_update_type'),

  // ── Classification ───────────────────────────────────────────────
  priority: taskPriorityEnum('priority'),
  taskCategory: taskCategoryEnum('task_category'),
  complexity: taskComplexityEnum('complexity'),
  tags: text('tags').array(),

  // ── Context flags ────────────────────────────────────────────────
  isClientFacing: boolean('is_client_facing').notNull().default(false),
  isBlocking: boolean('is_blocking').notNull().default(false),
  blockedByDescription: text('blocked_by_description'),
  dependsOnDescription: text('depends_on_description'),
  targetEnvironment: targetEnvironmentEnum('target_environment').notNull().default('not_specified'),
  // JSON array of { type, ref, label, url? } — external ticket/PR/Slack refs
  externalReferences: jsonb('external_references').notNull().default([]),

  // ── Standup extraction ───────────────────────────────────────────
  rawQuote: text('raw_quote'),
  saidByResourceId: uuid('said_by_resource_id')
    .references(() => resources.id, { onDelete: 'set null' }),
  resourceTaskCompletionConfidence: resourceTaskCompletionConfidenceEnum('resource_task_completion_confidence'),
  isCarriedOver: boolean('is_carried_over').notNull().default(false),

  // ── Deadline ─────────────────────────────────────────────────────
  originalDeadlinePhrase: text('original_deadline_phrase'),
  resolvedDeadlineDate: date('resolved_deadline_date'),
  deadlineIsCompletion: boolean('deadline_is_completion').notNull().default(false),

  // ── Hour estimates ───────────────────────────────────────────────
  resourceEstimatedHours: real('resource_estimated_hours'),
  aiEstimatedHoursMin: real('ai_estimated_hours_min'),
  aiEstimatedHoursMax: real('ai_estimated_hours_max'),
  aiEstimateConfidence: aiEstimateConfidenceEnum('ai_estimate_confidence'),
  aiEstimateReasoning: text('ai_estimate_reasoning'),

  // ── Slippage tracking ────────────────────────────────────────────
  timesSlipped: integer('times_slipped').notNull().default(0),
  totalDaysSlipped: integer('total_days_slipped').notNull().default(0),

  // ── AI match metadata ────────────────────────────────────────────
  aiMatchConfidence: aiEstimateConfidenceEnum('ai_match_confidence'),
  aiMatchReasoning: text('ai_match_reasoning'),
  aiExtractionConfidence: aiEstimateConfidenceEnum('ai_extraction_confidence'),

  // ── Standup mention tracking ─────────────────────────────────────
  firstMentionedStandupId: uuid('first_mentioned_standup_id')
    .references(() => standups.id, { onDelete: 'set null' }),
  lastMentionedStandupId: uuid('last_mentioned_standup_id')
    .references(() => standups.id, { onDelete: 'set null' }),
  lastMentionedAt: date('last_mentioned_at'),
  standupMentionCount: integer('standup_mention_count').notNull().default(1),

  // ── Timestamps ───────────────────────────────────────────────────
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
