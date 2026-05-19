import { z } from 'zod'

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

export const TaskClientLinkSchema = z.object({
  clientMemberName: z.string(),
  assignmentType: z.enum(['assigned_by', 'mentioned_by', 'reviewing']),
})

export const AttendanceItemSchema = z.object({
  resourceId: z.string(),
  resourceName: z.string(),
  attended: z.boolean(),
  confidence: ConfidenceEnum,
  note: z.string().optional(),
})

export const ClientTeamMemberItemSchema = z.object({
  name: z.string(),
  inferredRole: z.string().nullable(),
})

// Risk scoped to a specific task — nested inside AnalyzedTask
export const TaskRiskSchema = z.object({
  category: RiskCategoryEnum,
  severity: SeverityEnum,
  title: z.string(),
  description: z.string(),
  aiReasoning: z.string(),
  sourceRawQuote: z.string().nullable(),
})

// Risk at project/resource level — not tied to a specific task (attendance patterns, project-wide issues)
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

// Core entity: one task with all findings nested inside
export const AnalyzedTaskSchema = z.object({
  resourceId: z.string(),
  type: z.enum(['completed', 'committed', 'blocker']),
  title: z.string(),
  description: z.string().nullable(),
  rawQuote: z.string().nullable(),
  commitmentConfidence: z.enum(['firm', 'vague', 'aspirational']),
  isCarriedOver: z.boolean(),
  clientMemberLinks: z.array(TaskClientLinkSchema),

  // Deadline
  deadlinePhrase: z.string().nullable(),
  resolvedDeadline: z.string().nullable(),
  deadlineIsCompletion: z.boolean(),

  // Hours — resourceEstimatedHours is what the developer explicitly stated
  resourceEstimatedHours: z.number().nullable(),
  aiEstimatedHoursMin: z.number().nullable(),
  aiEstimatedHoursMax: z.number().nullable(),
  aiEstimateConfidence: z.enum(['low', 'medium', 'high']).nullable(),
  aiEstimateReasoning: z.string().nullable(),

  // Match to an existing open task
  existingTaskId: z.string().nullable(),
  matchConfidence: ConfidenceEnum.nullable(),
  matchReasoning: z.string().nullable(),

  // Risks that are directly about this task
  risks: z.array(TaskRiskSchema),
})

// Top-level output of the single analyze-standup call
export const StandupAnalysisSchema = z.object({
  attendance: z.array(AttendanceItemSchema),
  clientTeamMembers: z.array(ClientTeamMemberItemSchema),
  tasks: z.array(AnalyzedTaskSchema),
  // Risks not tied to a specific task: low attendance streaks, project-wide concerns, etc.
  risks: z.array(StandaloneRiskSchema),
})

export type TaskClientLink = z.infer<typeof TaskClientLinkSchema>
export type AttendanceItem = z.infer<typeof AttendanceItemSchema>
export type ClientTeamMemberItem = z.infer<typeof ClientTeamMemberItemSchema>
export type TaskRisk = z.infer<typeof TaskRiskSchema>
export type StandaloneRisk = z.infer<typeof StandaloneRiskSchema>
export type AnalyzedTask = z.infer<typeof AnalyzedTaskSchema>
export type StandupAnalysis = z.infer<typeof StandupAnalysisSchema>
