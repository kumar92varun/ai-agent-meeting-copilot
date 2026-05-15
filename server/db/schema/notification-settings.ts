import { pgTable, uuid, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { resources } from './resources'

export const notificationSeverityThresholdEnum = pgEnum('notification_severity_threshold', [
  'low',
  'medium',
  'high',
  'critical',
])

export const notificationSettings = pgTable('notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => resources.id, { onDelete: 'cascade' }),
  dailyRiskDigestEnabled: boolean('daily_risk_digest_enabled').notNull().default(true),
  immediateRiskAlertEnabled: boolean('immediate_risk_alert_enabled').notNull().default(false),
  severityThreshold: notificationSeverityThresholdEnum('severity_threshold')
    .notNull()
    .default('medium'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
