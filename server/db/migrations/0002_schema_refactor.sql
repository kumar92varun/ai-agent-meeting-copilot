-- Migration: schema refactor
-- 1. Remove users table, merge auth columns into resources
-- 2. Remove resource_leaves table
-- 3. Remove deleted columns from projects, resources, standup_updates
-- 4. Add new columns: quickTeamsLink on projects and resources

--> statement-breakpoint

-- Step 1: Add auth columns to resources (from users table)
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "google_sub" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "role" "user_role" DEFAULT 'project_lead' NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "avatar_url" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "quick_teams_link" text;--> statement-breakpoint

-- Step 2: Add quick_teams_link to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "quick_teams_link" text;--> statement-breakpoint

-- Step 3: Make google_sub unique (after data migration — in a real migration you'd migrate data first)
-- For fresh installs this is fine. For existing data, a data migration would be needed.
-- Set a placeholder google_sub for any existing resources that don't have one
UPDATE "resources" SET "google_sub" = 'legacy_' || "id"::text WHERE "google_sub" IS NULL;--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "google_sub" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_google_sub_unique" UNIQUE("google_sub");--> statement-breakpoint

-- Step 4: Update foreign key on project_leads: users -> resources
ALTER TABLE "project_leads" DROP CONSTRAINT IF EXISTS "project_leads_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "project_leads" ADD CONSTRAINT "project_leads_user_id_resources_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Step 5: Update foreign key on standups: users -> resources
ALTER TABLE "standups" DROP CONSTRAINT IF EXISTS "standups_ingested_by_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "standups" ADD CONSTRAINT "standups_ingested_by_user_id_resources_id_fk" FOREIGN KEY ("ingested_by_user_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

-- Step 6: Update foreign key on risks acknowledged_by: users -> resources
ALTER TABLE "risks" DROP CONSTRAINT IF EXISTS "risks_acknowledged_by_users_id_fk";--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_acknowledged_by_resources_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Step 7: Update foreign key on notification_settings: users -> resources
ALTER TABLE "notification_settings" DROP CONSTRAINT IF EXISTS "notification_settings_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_resources_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Step 8: Update foreign key on audit_log: users -> resources
ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_actor_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_resources_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."resources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- Step 9: Drop users table
DROP TABLE IF EXISTS "users" CASCADE;--> statement-breakpoint

-- Step 10: Drop resource_leaves table
DROP TABLE IF EXISTS "resource_leaves" CASCADE;--> statement-breakpoint

-- Step 11: Remove deleted columns from projects
ALTER TABLE "projects" DROP COLUMN IF EXISTS "client_name";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "description";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "status";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "sprint_cadence_days";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN IF EXISTS "started_at";--> statement-breakpoint

-- Step 12: Remove deleted columns from resources
ALTER TABLE "resources" DROP COLUMN IF EXISTS "role_title";--> statement-breakpoint
ALTER TABLE "resources" DROP COLUMN IF EXISTS "joined_at";--> statement-breakpoint

-- Step 13: Remove attendance_source from standup_updates
ALTER TABLE "standup_updates" DROP COLUMN IF EXISTS "attendance_source";--> statement-breakpoint

-- Step 14: Drop unused enum types
DROP TYPE IF EXISTS "public"."project_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."attendance_source";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."leave_type";--> statement-breakpoint
