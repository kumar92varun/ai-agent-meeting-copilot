import { pgTable, uuid, date, real, integer, timestamp, unique } from 'drizzle-orm/pg-core'
import { projects } from './projects'
import { resources } from './resources'

export const dailyMetricsProject = pgTable(
  'daily_metrics_project',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    metricDate: date('metric_date').notNull(),
    healthScore: real('health_score').notNull().default(100),
    openRisksCount: integer('open_risks_count').notNull().default(0),
    overdueTasksCount: integer('overdue_tasks_count').notNull().default(0),
    completedTasksCount: integer('completed_tasks_count').notNull().default(0),
    standupsHeldCount: integer('standups_held_count').notNull().default(0),
    attendanceRate: real('attendance_rate').notNull().default(0),
    avgSlippageDays: real('avg_slippage_days').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.projectId, table.metricDate)]
)

export const dailyMetricsResource = pgTable(
  'daily_metrics_resource',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    metricDate: date('metric_date').notNull(),
    attendanceRate: real('attendance_rate').notNull().default(0),
    tasksCommitted: integer('tasks_committed').notNull().default(0),
    tasksCompletedOnTime: integer('tasks_completed_on_time').notNull().default(0),
    tasksSlipped: integer('tasks_slipped').notNull().default(0),
    avgEstimateAccuracyPct: real('avg_estimate_accuracy_pct'),
    totalEstimatedHours: real('total_estimated_hours').notNull().default(0),
    totalAiEstimatedHoursMidpoint: real('total_ai_estimated_hours_midpoint').notNull().default(0),
    risksCount: integer('risks_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.resourceId, table.metricDate)]
)
