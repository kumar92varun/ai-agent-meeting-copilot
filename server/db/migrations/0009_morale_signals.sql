-- ============================================================
-- Migration 0009: Team morale signals + new risk categories
-- ============================================================

-- 1. Add new risk categories to the existing enum
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'sustained_low_morale';
ALTER TYPE risk_category ADD VALUE IF NOT EXISTS 'team_tension';

-- 2. Create standup_morale_signals table
CREATE TABLE IF NOT EXISTS standup_morale_signals (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  standup_id             uuid        NOT NULL REFERENCES project_standups(id) ON DELETE CASCADE,
  project_id             uuid        NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  resource_id            uuid        REFERENCES resources(id) ON DELETE SET NULL,
  resource_name          text,

  -- Per-person fields
  sentiment              text,       -- positive | neutral | negative | mixed
  engagement_level       text,       -- high | medium | low
  workload_signal        text,       -- overloaded | balanced | underutilised | unclear
  stress_signal          text,       -- none | mild | moderate | high
  signals                text[],
  raw_quotes             text[],

  -- Team-summary fields (resource_id IS NULL)
  overall_team_sentiment text,       -- positive | neutral | negative | mixed
  team_energy            text,       -- high | medium | low
  collaboration_signal   text,       -- strong | neutral | weak
  tension_signal         text,       -- none | mild | notable
  ai_observation         text,

  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_morale_standup_id          ON standup_morale_signals(standup_id);
CREATE INDEX IF NOT EXISTS idx_morale_project_resource    ON standup_morale_signals(project_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_morale_project_created     ON standup_morale_signals(project_id, created_at DESC);
