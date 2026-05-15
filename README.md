# Crownstack Standup Intelligence

A management-facing agentic AI tool that turns daily standup transcripts into structured project and resource health intelligence. Transcripts may be bilingual (Hindi + English / Hinglish) — the LangGraph extraction pipeline handles both natively.

---

## Repository Structure

```
crownstack-standup-intelligence/
├── README.md
├── INSTALLATION.md
├── package.json                        # pnpm workspace root
├── nuxt.config.ts                      # Nuxt 3 configuration
├── tsconfig.json
├── drizzle.config.ts                   # Drizzle ORM + drizzle-kit
├── ecosystem.config.cjs                # PM2 process definitions
├── .env.example                        # Required environment variables
│
├── app/                                # Nuxt frontend (srcDir)
│   ├── app.vue
│   ├── error.vue
│   ├── assets/css/main.css
│   ├── layouts/
│   │   ├── default.vue                 # Authenticated shell (sidebar + topbar)
│   │   └── auth.vue                    # Login screen layout
│   ├── pages/
│   │   ├── index.vue                   # Redirects → /dashboard
│   │   ├── login.vue                   # Google OAuth login
│   │   ├── dashboard.vue               # All-projects health grid + KPI strip
│   │   ├── projects/
│   │   │   ├── index.vue               # Project list
│   │   │   └── [id].vue                # Tabs: Overview / Tasks / Standups / Resources / Risks
│   │   ├── resources/
│   │   │   ├── index.vue
│   │   │   └── [id].vue                # Tabs: Performance / Tasks / Standups / Risks
│   │   ├── risks/index.vue             # Cross-cutting risks inbox
│   │   ├── standups/
│   │   │   ├── new.vue                 # Paste → Analyze (SSE) → Review → Save
│   │   │   └── [id].vue                # Historical standup view
│   │   └── admin/
│   │       ├── index.vue
│   │       ├── projects.vue
│   │       ├── resources.vue
│   │       ├── mappings.vue            # project_resources CRUD
│   │       ├── leaves.vue              # resource_leaves CRUD
│   │       ├── users.vue               # admin/project_lead user management
│   │       └── notifications.vue       # Email alert settings
│   ├── middleware/
│   │   ├── auth.global.ts              # Redirect unauthenticated → /login
│   │   └── role.ts                     # /admin/* requires admin role
│   └── utils/
│       ├── format.ts                   # Date/duration formatters
│       └── permissions.ts              # Client-side UI gating (not security)
│
├── server/                             # Nuxt Nitro backend
│   ├── api/
│   │   ├── health.get.ts               # GET /api/health
│   │   ├── auth/
│   │   │   ├── google.get.ts           # OAuth callback
│   │   │   └── logout.post.ts
│   │   ├── projects/                   # CRUD + refresh-metrics
│   │   ├── resources/                  # CRUD + refresh-metrics
│   │   ├── project-resources/          # Mapping CRUD
│   │   ├── resource-leaves/            # Leave CRUD
│   │   ├── standups/
│   │   │   ├── analyze.post.ts         # SSE: LangGraph extraction pipeline
│   │   │   ├── index.{get,post}.ts     # List / save reviewed extraction
│   │   │   └── [id].get.ts
│   │   ├── tasks/                      # List + patch
│   │   ├── risks/                      # List + acknowledge/resolve
│   │   ├── metrics/                    # project-summary / resource-summary / dashboard
│   │   ├── admin/                      # users + notification-settings
│   │   └── jobs/[id].get.ts            # BullMQ job status polling
│   ├── agents/                         # LangGraph standup processing
│   │   ├── standup-graph.ts            # Graph definition + entrypoint
│   │   ├── nodes/                      # One file per graph node
│   │   │   ├── parse-transcript.ts
│   │   │   ├── infer-attendance.ts
│   │   │   ├── extract-tasks.ts
│   │   │   ├── match-existing-tasks.ts
│   │   │   ├── resolve-deadlines.ts
│   │   │   ├── estimate-hours.ts
│   │   │   └── detect-risks.ts
│   │   ├── prompts/                    # Versioned prompt builders
│   │   │   ├── hinglish-examples.ts    # Few-shot Hinglish patterns
│   │   │   └── *.prompt.ts
│   │   └── schemas/index.ts            # Zod schemas for structured LLM outputs
│   ├── jobs/                           # BullMQ job implementations
│   │   ├── queues.ts                   # Queue + Redis connection instances
│   │   ├── compute-project-rollups.ts
│   │   ├── compute-resource-rollups.ts
│   │   ├── check-deadline-completions.ts
│   │   ├── generate-embedding.ts
│   │   └── send-daily-risk-digest.ts
│   ├── worker.ts                       # BullMQ worker process entrypoint
│   ├── db/
│   │   ├── client.ts                   # Drizzle singleton
│   │   ├── schema/                     # One file per domain table
│   │   │   ├── index.ts                # Re-exports all schemas
│   │   │   ├── users.ts
│   │   │   ├── projects.ts
│   │   │   ├── project-leads.ts
│   │   │   ├── resources.ts
│   │   │   ├── project-resources.ts
│   │   │   ├── resource-leaves.ts
│   │   │   ├── standups.ts
│   │   │   ├── standup-updates.ts
│   │   │   ├── tasks.ts
│   │   │   ├── project-resource-tasks.ts
│   │   │   ├── risks.ts
│   │   │   ├── daily-metrics.ts
│   │   │   ├── embeddings.ts
│   │   │   ├── llm-call-logs.ts
│   │   │   ├── notification-settings.ts
│   │   │   └── audit-log.ts
│   │   ├── migrations/                 # drizzle-kit generated SQL
│   │   └── seed/bootstrap.ts           # Creates first admin from env
│   ├── llm/
│   │   ├── index.ts                    # getChatModel() + getEmbeddingModel() factories
│   │   ├── providers/                  # openai.ts / anthropic.ts / google.ts
│   │   ├── model-warnings.ts           # Hinglish capability startup check
│   │   └── logging.ts                  # Wraps LLM calls → llm_call_logs table
│   ├── email/
│   │   ├── index.ts                    # EmailProvider interface + factory
│   │   ├── providers/                  # sendgrid.ts / ses.ts / smtp.ts
│   │   └── templates/                  # daily-risk-digest.ts / risk-alert.ts
│   ├── middleware/
│   │   ├── auth.ts                     # Session validation for API routes
│   │   └── audit.ts                    # Mutation → audit_log
│   ├── plugins/
│   │   ├── llm-startup-check.ts        # Warns if LLM has weak Hinglish support
│   │   └── bullmq-scheduler.ts         # Registers cron jobs on boot
│   └── utils/
│       ├── logger.ts                   # pino instance
│       ├── errors.ts                   # AppError class
│       ├── dates.ts                    # IST-aware date helpers
│       ├── name-matching.ts            # Fuzzy resource name matching
│       └── permissions.ts              # Server-side RBAC helpers
│
├── shared/                             # Types used by both client and server
│   ├── types/
│   │   ├── domain.ts                   # Project, Resource, Task, Risk, etc.
│   │   └── api.ts                      # Request/response DTOs
│   └── constants/
│       ├── roles.ts
│       ├── risk-categories.ts
│       └── llm-models.ts               # Known models + Hinglish capability flag
│
└── scripts/
    ├── seed.ts                         # pnpm db:seed
    └── inspect-llm-log.ts              # Replay any logged LLM call by ID
```

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Nuxt 3 (Vue 3, TypeScript, Nitro) |
| UI | Nuxt UI (Tailwind + Headless UI) |
| Database | PostgreSQL 16 + pgvector |
| ORM | Drizzle ORM + drizzle-kit |
| Queue | BullMQ + Redis 7 |
| Auth | nuxt-auth-utils + Google OAuth |
| AI Orchestration | LangGraph.js |
| LLM (default) | OpenAI GPT-4o (swappable via env) |
| Email | SendGrid (swappable via env) |
| Logging | pino (structured JSON) |
| Process Manager | PM2 |
| Hosting | DigitalOcean Ubuntu 24.04 droplet |

---

## LangGraph Pipeline

```
START
  → parse-transcript        (segment by speaker, fuzzy-match to resource list)
  → infer-attendance        (who spoke vs. full team list)
  → extract-tasks           (yesterday done + today committed + blockers; Hinglish → English)
  → match-existing-tasks    (dedup against open tasks; embedding similarity backup)
  → resolve-deadlines       ("kal", "parso", "by Friday" → ISO date)
  → estimate-hours          (AI min/max range for tasks without explicit estimate)
  → detect-risks            (rules + LLM: missed deadline, slippage, blocker, vague commit)
END
```

Results are returned to the UI **before** persistence. The reviewer can edit any field, toggle attendance, and then save. Persistence only happens on explicit **Save**.

---

## Hinglish Handling

All LangGraph prompts instruct the LLM to:
- Understand Hindi in Devanagari (`नहीं हो पाया`) and Romanized (`nahi ho paya`) forms
- Produce all structured output (task titles, risk descriptions, etc.) in **English**
- Preserve original Hinglish text verbatim in `raw_quote` fields for audit

Common Hinglish patterns handled:
- `kal` → yesterday (past tense) or tomorrow (future tense)
- `parso` → day before/after yesterday depending on tense
- `ho jayega` / `try karta hu` / `dekhta hu` → `commitment_confidence: vague`
- `atka hua hai` → blocker signal
- `client ne escalate kar diya` → high/critical risk

Fuzzy name matching (`server/utils/name-matching.ts`) uses Jaro-Winkler + Levenshtein at a loose 0.6 threshold to handle transcription mangling of Indian names.

---

## Key Commands

```bash
pnpm dev              # Start Nuxt dev server (port 3000)
pnpm worker:dev       # Start BullMQ worker (tsx watch)
pnpm build            # Production build
pnpm db:generate      # Generate Drizzle migrations from schema
pnpm db:migrate       # Apply pending migrations
pnpm db:seed          # Create bootstrap admin user
pnpm inspect-llm-log -- <id>   # Replay any LLM call by ID
```

---

## Roles

| Role | Access |
|------|--------|
| `admin` | Full access — all projects, resources, admin CRUD |
| `project_lead` | Assigned projects only (via `project_leads` join table) |

Resources (developers) have no login access in MVP.
