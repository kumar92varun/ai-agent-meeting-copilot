import { pgTable, uuid, text, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core'

export const resourceTypeEnum = pgEnum('resource_type', ['developer', 'designer', 'qa', 'devops'])
export const roleEnum = pgEnum('user_role', ['admin', 'project_lead'])

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email'),
  googleSub: text('google_sub').notNull().unique(),
  role: roleEnum('role').notNull().default('project_lead'),
  avatarUrl: text('avatar_url'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  resourceType: resourceTypeEnum('resource_type').notNull().default('developer'),
  isActive: boolean('is_active').notNull().default(true),
  quickTeamsLink: text('quick_teams_link'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
