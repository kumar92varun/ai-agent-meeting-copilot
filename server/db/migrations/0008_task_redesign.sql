-- ============================================================
-- Migration 0008: Task model redesign
-- Safe to run on a clean/dev DB — truncates all task-related data.
-- ============================================================

-- 1. Truncate task-related tables (CASCADE handles FK children)
TRUNCATE TABLE project_task_client_assignments CASCADE;
TRUNCATE TABLE project_resource_tasks CASCADE;
TRUNCATE TABLE project_tasks CASCADE;
DELETE FROM vector_store WHERE entity_type = 'task';
DELETE FROM risks; -- risks reference tasks; clear for clean state

-- 2. Drop old enums that are being replaced or renamed
DROP TYPE IF EXISTS commitment_confidence CASCADE;
DROP TYPE IF EXISTS ai_estimate_confidence CASCADE;

-- 3. Create new enums
CREATE TYPE ai_estimate_confidence AS ENUM ('low', 'medium', 'high');

CREATE TYPE resource_task_completion_confidence AS ENUM (
  'completion_guaranteed',
  'high_probability',
  'no_guarantee'
);

CREATE TYPE task_update_type AS ENUM ('completed', 'committed', 'blocker');

CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');

CREATE TYPE task_category AS ENUM (
  'feature', 'bug', 'refactor', 'testing', 'review', 'devops', 'other'
);

CREATE TYPE task_complexity AS ENUM ('simple', 'medium', 'complex');

CREATE TYPE target_environment AS ENUM (
  'development', 'staging', 'production', 'not_specified'
);

CREATE TYPE task_history_type AS ENUM (
  'ai_created',
  'ai_updated',
  'field_edited',
  'assignee_added',
  'assignee_removed',
  'status_changed',
  'deadline_extended',
  'standup_mentioned',
  'context_learnt'
);

-- 4. Add new columns to project_tasks
ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS task_update_type       task_update_type,
  ADD COLUMN IF NOT EXISTS priority               task_priority,
  ADD COLUMN IF NOT EXISTS task_category          task_category,
  ADD COLUMN IF NOT EXISTS complexity             task_complexity,
  ADD COLUMN IF NOT EXISTS tags                   text[],
  ADD COLUMN IF NOT EXISTS is_client_facing       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blocking            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_by_description text,
  ADD COLUMN IF NOT EXISTS depends_on_description text,
  ADD COLUMN IF NOT EXISTS target_environment     target_environment NOT NULL DEFAULT 'not_specified',
  ADD COLUMN IF NOT EXISTS external_references    jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_quote              text,
  ADD COLUMN IF NOT EXISTS said_by_resource_id    uuid REFERENCES resources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resource_task_completion_confidence resource_task_completion_confidence,
  ADD COLUMN IF NOT EXISTS is_carried_over        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_deadline_phrase text,
  ADD COLUMN IF NOT EXISTS resolved_deadline_date date,
  ADD COLUMN IF NOT EXISTS deadline_is_completion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resource_estimated_hours real,
  ADD COLUMN IF NOT EXISTS ai_estimated_hours_min real,
  ADD COLUMN IF NOT EXISTS ai_estimated_hours_max real,
  ADD COLUMN IF NOT EXISTS ai_estimate_confidence ai_estimate_confidence,
  ADD COLUMN IF NOT EXISTS ai_estimate_reasoning  text,
  ADD COLUMN IF NOT EXISTS times_slipped          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_days_slipped     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_match_confidence    ai_estimate_confidence,
  ADD COLUMN IF NOT EXISTS ai_match_reasoning     text,
  ADD COLUMN IF NOT EXISTS ai_extraction_confidence ai_estimate_confidence,
  ADD COLUMN IF NOT EXISTS last_mentioned_standup_id uuid REFERENCES project_standups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_mentioned_at      date,
  ADD COLUMN IF NOT EXISTS standup_mention_count  integer NOT NULL DEFAULT 1;

-- 5. Slim down project_resource_tasks — remove moved columns, add standup ref
ALTER TABLE project_resource_tasks
  DROP COLUMN IF EXISTS resource_estimated_hours,
  DROP COLUMN IF EXISTS ai_estimated_hours_min,
  DROP COLUMN IF EXISTS ai_estimated_hours_max,
  DROP COLUMN IF EXISTS ai_estimate_confidence,
  DROP COLUMN IF EXISTS ai_estimate_reasoning,
  DROP COLUMN IF EXISTS original_deadline_phrase,
  DROP COLUMN IF EXISTS resolved_deadline_date,
  DROP COLUMN IF EXISTS commitment_confidence,
  DROP COLUMN IF EXISTS times_deadline_extended,
  DROP COLUMN IF EXISTS total_days_slipped,
  ADD COLUMN IF NOT EXISTS added_by_standup_id uuid REFERENCES project_standups(id) ON DELETE SET NULL;

-- Ensure unique constraint on (task_id, resource_id) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_resource_tasks_task_id_resource_id_unique'
  ) THEN
    ALTER TABLE project_resource_tasks
      ADD CONSTRAINT project_resource_tasks_task_id_resource_id_unique
      UNIQUE (task_id, resource_id);
  END IF;
END $$;

-- 6. Create task_history table
CREATE TABLE IF NOT EXISTS task_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  actor_resource_id uuid REFERENCES resources(id) ON DELETE SET NULL,
  actor_label       text NOT NULL,
  standup_id        uuid REFERENCES project_standups(id) ON DELETE SET NULL,
  change_type       task_history_type NOT NULL,
  field_name        text,
  old_value         jsonb,
  new_value         jsonb,
  note              text,
  learnt_context    text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id    ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id        ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_resolved_deadline ON project_tasks(resolved_deadline_date) WHERE resolved_deadline_date IS NOT NULL;
