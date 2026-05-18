-- Rename embeddings table to vector_store and extend with project/resource context
ALTER TABLE "embeddings" RENAME TO "vector_store";
ALTER TABLE "vector_store" RENAME CONSTRAINT "embeddings_pkey" TO "vector_store_pkey";

ALTER TABLE "vector_store" ADD COLUMN "project_id" uuid REFERENCES "projects"("id") ON DELETE SET NULL;
ALTER TABLE "vector_store" ADD COLUMN "resource_id" uuid REFERENCES "resources"("id") ON DELETE SET NULL;

DROP INDEX IF EXISTS "embeddings_entity_idx";
CREATE INDEX "vector_store_entity_idx" ON "vector_store" ("entity_type", "entity_id");
CREATE INDEX "vector_store_project_idx" ON "vector_store" ("project_id");
CREATE INDEX "vector_store_resource_idx" ON "vector_store" ("resource_id");

--> statement-breakpoint

-- Client team members discovered from standup transcripts
CREATE TABLE "project_client_team_members" (
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

-- Links tasks to the client team members who assigned or were mentioned in context
CREATE TYPE "task_client_assignment_type" AS ENUM ('assigned_by', 'mentioned_by', 'reviewing');

CREATE TABLE "project_task_client_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "project_tasks"("id") ON DELETE CASCADE,
  "client_member_id" uuid NOT NULL REFERENCES "project_client_team_members"("id") ON DELETE CASCADE,
  "assignment_type" "task_client_assignment_type" NOT NULL,
  "source_standup_id" uuid REFERENCES "project_standups"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("task_id", "client_member_id")
);
