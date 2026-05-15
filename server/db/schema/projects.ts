import { pgTable, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core'

export const projectStatusEnum = pgEnum('project_status', ['active', 'paused', 'completed'])

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  clientName: text('client_name').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('active'),
  sprintCadenceDays: integer('sprint_cadence_days').notNull().default(14),
  startedAt: timestamp('started_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
