import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { standups } from './standups'
import { projects } from './projects'
import { resources } from './resources'

// One row per team member per standup (resource_id set) +
// one team-summary row per standup (resource_id null).
export const standupMoraleSignals = pgTable('standup_morale_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  standupId: uuid('standup_id')
    .notNull()
    .references(() => standups.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'restrict' }),

  // null = team-summary row; set = per-person row
  resourceId: uuid('resource_id')
    .references(() => resources.id, { onDelete: 'set null' }),
  resourceName: text('resource_name'), // denormalised for fast display

  // ── Per-person fields ─────────────────────────────────────────
  // positive | neutral | negative | mixed
  sentiment: text('sentiment'),
  // high | medium | low
  engagementLevel: text('engagement_level'),
  // overloaded | balanced | underutilised | unclear
  workloadSignal: text('workload_signal'),
  // none | mild | moderate | high
  stressSignal: text('stress_signal'),
  // Specific detected observations, e.g. "Expressed frustration about blocked task"
  signals: text('signals').array(),
  // Exact Hinglish/English quotes that triggered each signal
  rawQuotes: text('raw_quotes').array(),

  // ── Team-summary fields (resource_id IS NULL) ────────────────
  // positive | neutral | negative | mixed
  overallTeamSentiment: text('overall_team_sentiment'),
  // high | medium | low
  teamEnergy: text('team_energy'),
  // strong | neutral | weak
  collaborationSignal: text('collaboration_signal'),
  // none | mild | notable
  tensionSignal: text('tension_signal'),
  // Free-text AI observation on team dynamics
  aiObservation: text('ai_observation'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
