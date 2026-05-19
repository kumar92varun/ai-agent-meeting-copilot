import { z } from 'zod'

// ── Shared primitives ──────────────────────────────────────────────────────────
const ConfidenceEnum = z.enum(['high', 'medium', 'low'])
const SeverityEnum = z.enum(['low', 'medium', 'high', 'critical'])
const RiskCategoryEnum = z.enum([
  'missed_deadline',
  'frequent_slippage',
  'low_attendance',
  'vague_updates',
  'blocker_unresolved',
  'estimate_mismatch',
  'vague_commitment',
  'other',
])

export const ExternalReferenceSchema = z.object({
  type: z.enum(['jira', 'github_pr', 'github_issue', 'slack', 'linear', 'notion', 'confluence', 'other']),
  ref: z.string(),
  label: z.string(),
  url: z.string().nullable(),
})

export const TaskClientLinkSchema = z.object({
  clientMemberName: z.string(),
  assignmentType: z.enum(['assigned_by', 'mentioned_by', 'reviewing']),
})

export const AttendanceItemSchema = z.object({
  resourceId: z.string(),
  resourceName: z.string(),
  attended: z.boolean(),
  confidence: ConfidenceEnum,
  note: z.string().nullable(),
})

export const ClientTeamMemberItemSchema = z.object({
  name: z.string(),
  inferredRole: z.string().nullable(),
})

// ── Risk scoped to a specific task ─────────────────────────────────────────────
export const TaskRiskSchema = z.object({
  category: RiskCategoryEnum,
  severity: SeverityEnum,
  title: z.string(),
  description: z.string(),
  aiReasoning: z.string(),
  sourceRawQuote: z.string().nullable(),
})

// ── Risk at project/resource level ─────────────────────────────────────────────
export const StandaloneRiskSchema = z.object({
  riskType: z.enum(['project', 'resource']),
  resourceId: z.string().nullable(),
  category: RiskCategoryEnum,
  severity: SeverityEnum,
  title: z.string(),
  description: z.string(),
  aiReasoning: z.string(),
  sourceRawQuote: z.string().nullable(),
})

// ── Core task entity — all findings nested ─────────────────────────────────────
export const AnalyzedTaskSchema = z.object({
  // Who + what
  resourceId: z.string(),                         // primary assignee resource ID
  additionalAssigneeIds: z.array(z.string()),      // secondary assignees (rare)
  saidByResourceId: z.string().nullable(),         // who spoke about this task
  type: z.enum(['completed', 'committed', 'blocker']),

  // Task identity
  title: z.string(),
  description: z.string().nullable(),
  rawQuote: z.string().nullable(),

  // Classification
  priority: z.enum(['critical', 'high', 'medium', 'low']).nullable(),
  taskCategory: z.enum(['feature', 'bug', 'refactor', 'testing', 'review', 'devops', 'other']).nullable(),
  complexity: z.enum(['simple', 'medium', 'complex']).nullable(),
  tags: z.array(z.string()),
  isClientFacing: z.boolean(),
  isBlocking: z.boolean(),
  blockedByDescription: z.string().nullable(),
  dependsOnDescription: z.string().nullable(),
  targetEnvironment: z.enum(['development', 'staging', 'production', 'not_specified']),
  externalReferences: z.array(ExternalReferenceSchema),

  // Commitment
  resourceTaskCompletionConfidence: z.enum(['completion_guaranteed', 'high_probability', 'no_guarantee']),
  isCarriedOver: z.boolean(),

  // Deadline
  deadlinePhrase: z.string().nullable(),
  resolvedDeadline: z.string().nullable(),
  deadlineIsCompletion: z.boolean(),

  // Hours
  resourceEstimatedHours: z.number().nullable(),
  aiEstimatedHoursMin: z.number().nullable(),
  aiEstimatedHoursMax: z.number().nullable(),
  aiEstimateConfidence: z.enum(['low', 'medium', 'high']).nullable(),
  aiEstimateReasoning: z.string().nullable(),

  // Match to existing task
  existingTaskId: z.string().nullable(),
  matchConfidence: ConfidenceEnum.nullable(),
  matchReasoning: z.string().nullable(),

  // Context update for existing tasks
  isContextUpdate: z.boolean(),
  learntContext: z.string().nullable(),

  // AI confidence
  aiExtractionConfidence: z.enum(['low', 'medium', 'high']),

  // Client member links
  clientMemberLinks: z.array(TaskClientLinkSchema),

  // Task-level risks
  risks: z.array(TaskRiskSchema),
})

// ── Morale signals ────────────────────────────────────────────────────────────
export const PersonMoraleSignalSchema = z.object({
  resourceId: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  engagementLevel: z.enum(['high', 'medium', 'low']),
  workloadSignal: z.enum(['overloaded', 'balanced', 'underutilised', 'unclear']),
  stressSignal: z.enum(['none', 'mild', 'moderate', 'high']),
  signals: z.array(z.string()),
  rawQuotes: z.array(z.string()),
})

export const TeamMoraleSummarySchema = z.object({
  overallTeamSentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  teamEnergy: z.enum(['high', 'medium', 'low']),
  collaborationSignal: z.enum(['strong', 'neutral', 'weak']),
  tensionSignal: z.enum(['none', 'mild', 'notable']),
  aiObservation: z.string(),
})

export const MoraleAnalysisSchema = z.object({
  personSignals: z.array(PersonMoraleSignalSchema),
  teamSummary: TeamMoraleSummarySchema,
})

// ── Top-level standup analysis output ─────────────────────────────────────────
export const StandupAnalysisSchema = z.object({
  attendance: z.array(AttendanceItemSchema),
  clientTeamMembers: z.array(ClientTeamMemberItemSchema),
  tasks: z.array(AnalyzedTaskSchema),
  risks: z.array(StandaloneRiskSchema),
  morale: MoraleAnalysisSchema,
})

export type PersonMoraleSignal = z.infer<typeof PersonMoraleSignalSchema>
export type TeamMoraleSummary = z.infer<typeof TeamMoraleSummarySchema>
export type MoraleAnalysis = z.infer<typeof MoraleAnalysisSchema>
export type ExternalReference = z.infer<typeof ExternalReferenceSchema>
export type TaskClientLink = z.infer<typeof TaskClientLinkSchema>
export type AttendanceItem = z.infer<typeof AttendanceItemSchema>
export type ClientTeamMemberItem = z.infer<typeof ClientTeamMemberItemSchema>
export type TaskRisk = z.infer<typeof TaskRiskSchema>
export type StandaloneRisk = z.infer<typeof StandaloneRiskSchema>
export type AnalyzedTask = z.infer<typeof AnalyzedTaskSchema>
export type StandupAnalysis = z.infer<typeof StandupAnalysisSchema>
