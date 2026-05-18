-- Ensure vector_store exists (rename may have partially applied in 0006)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vector_store' AND table_schema = 'public')
  THEN
    ALTER TABLE "embeddings" RENAME TO "vector_store";
  END IF;
END $$;

--> statement-breakpoint

-- Add project_id / resource_id columns to vector_store if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vector_store' AND column_name = 'project_id') THEN
    ALTER TABLE "vector_store" ADD COLUMN "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vector_store' AND column_name = 'resource_id') THEN
    ALTER TABLE "vector_store" ADD COLUMN "resource_id" uuid REFERENCES "resources"("id") ON DELETE SET NULL;
  END IF;
END $$;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "project_client_team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "inferred_role" text,
  "first_mentioned_standup_id" uuid REFERENCES "project_standups"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("project_id", "name")
);

--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_client_assignment_type') THEN
    CREATE TYPE "task_client_assignment_type" AS ENUM ('assigned_by', 'mentioned_by', 'reviewing');
  END IF;
END $$;

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "project_task_client_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "project_tasks"("id") ON DELETE CASCADE,
  "client_member_id" uuid NOT NULL REFERENCES "project_client_team_members"("id") ON DELETE CASCADE,
  "assignment_type" "task_client_assignment_type" NOT NULL,
  "source_standup_id" uuid REFERENCES "project_standups"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("task_id", "client_member_id")
);
