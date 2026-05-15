import { z } from 'zod'

export const SpeakerSegmentSchema = z.object({
  speakerLabel: z.string(),
  matchedResourceId: z.string().nullable(),
  matchedResourceName: z.string().nullable(),
  matchConfidence: z.enum(['high', 'medium', 'low']),
  text: z.string(),
})

export const AttendanceItemSchema = z.object({
  resourceId: z.string(),
  resourceName: z.string(),
  attended: z.boolean(),
  attendanceSource: z.enum(['ai_inferred', 'human_confirmed']).default('ai_inferred'),
  confidence: z.enum(['high', 'medium', 'low']),
  note: z.string().optional(),
})

export const ExtractedTaskItemSchema = z.object({
  resourceId: z.string(),
  type: z.enum(['completed', 'committed', 'blocker']),
  title: z.string(),
  description: z.string().nullable(),
  deadlinePhrase: z.string().nullable(),
  estimatedHours: z.number().nullable(),
  commitmentConfidence: z.enum(['firm', 'vague', 'aspirational']),
  isCarriedOver: z.boolean().default(false),
  rawQuote: z.string().nullable(),
})

export const MatchResultItemSchema = z.object({
  extractedIndex: z.number(),
  existingTaskId: z.string().nullable(),
  isMatch: z.boolean(),
  matchConfidence: z.enum(['high', 'medium', 'low']),
  updatedDescription: z.string().nullable(),
  reasoning: z.string(),
})

export const DeadlineResolutionSchema = z.object({
  originalPhrase: z.string(),
  resolvedDate: z.string().nullable(),
  isCompletion: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
})

export const HourEstimateSchema = z.object({
  taskIndex: z.number(),
  aiEstimatedHoursMin: z.number(),
  aiEstimatedHoursMax: z.number(),
  aiEstimateConfidence: z.enum(['low', 'medium', 'high']),
  aiEstimateReasoning: z.string(),
})

export const ExtractedRiskSchema = z.object({
  riskType: z.enum(['project', 'resource']),
  projectId: z.string().nullable(),
  resourceId: z.string().nullable(),
  category: z.enum([
    'missed_deadline',
    'frequent_slippage',
    'low_attendance',
    'vague_updates',
    'blocker_unresolved',
    'estimate_mismatch',
    'vague_commitment',
    'other',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string(),
  description: z.string(),
  aiReasoning: z.string(),
  sourceRawQuote: z.string().nullable(),
})

export type SpeakerSegment = z.infer<typeof SpeakerSegmentSchema>
export type AttendanceItem = z.infer<typeof AttendanceItemSchema>
export type ExtractedTaskItem = z.infer<typeof ExtractedTaskItemSchema>
export type MatchResultItem = z.infer<typeof MatchResultItemSchema>
export type DeadlineResolution = z.infer<typeof DeadlineResolutionSchema>
export type HourEstimate = z.infer<typeof HourEstimateSchema>
export type ExtractedRisk = z.infer<typeof ExtractedRiskSchema>
