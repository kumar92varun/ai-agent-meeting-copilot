import type { RiskSeverity } from '../constants/risk-categories'

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface AnalyzeStandupRequest {
  projectId: string
  standupDate: string
  transcript: string
}

export interface StandupStreamEvent {
  type: 'progress' | 'result' | 'error' | 'done'
  node?: string
  message?: string
  data?: ExtractionResult
  error?: string
}

export interface ExtractionResult {
  attendance: AttendanceItem[]
  identifiedClientMembers: IdentifiedClientMember[]
  tasks: ExtractedTask[]
  risks: ExtractedRisk[]
  morale: ExtractedMorale
  llmModelUsed: string
  tokensIn: number
  tokensOut: number
  processingDurationMs: number
}

export interface AttendanceItem {
  resourceId: string
  resourceName: string
  attended: boolean
  note: string | null
}

export interface AttendanceRow {
  resourceId: string
  resourceName: string
  attended: boolean
}

export interface IdentifiedClientMember {
  name: string
  inferredRole: string | null
}

export interface TaskClientLink {
  clientMemberName: string
  assignmentType: 'assigned_by' | 'mentioned_by' | 'reviewing'
}

export interface ExternalReference {
  type: 'jira' | 'github_pr' | 'github_issue' | 'slack' | 'linear' | 'notion' | 'confluence' | 'other'
  ref: string
  label: string
  url: string | null
}

export type ResourceTaskCompletionConfidence = 'completion_guaranteed' | 'high_probability' | 'no_guarantee'
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'
export type TaskCategory = 'feature' | 'bug' | 'refactor' | 'testing' | 'review' | 'devops' | 'other'
export type TaskComplexity = 'simple' | 'medium' | 'complex'
export type TargetEnvironment = 'development' | 'staging' | 'production' | 'not_specified'
export type TaskUpdateType = 'completed' | 'committed' | 'blocker'

export interface ExtractedTask {
  // Existing task match
  existingTaskId: string | null
  matchConfidence: 'high' | 'medium' | 'low' | null
  matchReasoning: string | null
  isContextUpdate: boolean
  learntContext: string | null         // what AI newly learnt today about an existing task

  // Who
  resourceId: string                   // primary assignee
  additionalAssigneeIds: string[]      // secondary assignees
  saidByResourceId: string | null      // who spoke about it
  type: TaskUpdateType

  // Task identity
  title: string
  description: string | null
  rawQuote: string | null

  // Classification
  priority: TaskPriority | null
  taskCategory: TaskCategory | null
  complexity: TaskComplexity | null
  tags: string[]
  isClientFacing: boolean
  isBlocking: boolean
  blockedByDescription: string | null
  dependsOnDescription: string | null
  targetEnvironment: TargetEnvironment
  externalReferences: ExternalReference[]

  // Commitment
  resourceTaskCompletionConfidence: ResourceTaskCompletionConfidence
  isCarriedOver: boolean

  // Deadline
  resolvedDeadlineDate: string | null
  originalDeadlinePhrase: string | null
  deadlineIsCompletion: boolean

  // Hours
  resourceEstimatedHours: number | null
  aiEstimatedHoursMin: number | null
  aiEstimatedHoursMax: number | null
  aiEstimateConfidence: 'low' | 'medium' | 'high' | null
  aiEstimateReasoning: string | null

  // AI confidence in extraction
  aiExtractionConfidence: 'low' | 'medium' | 'high'

  clientMemberLinks: TaskClientLink[]
}

export interface ExtractedRisk {
  riskType: 'project' | 'resource'
  projectId: string | null
  resourceId: string | null
  category: string
  severity: RiskSeverity
  title: string
  description: string
  aiReasoning: string
  sourceRawQuote: string | null
}

export interface SaveStandupRequest {
  projectId: string
  standupDate: string
  rawTranscript: string
  extraction: ExtractionResult
}

export interface MetricsPeriodParams {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  from?: string
  to?: string
}

export interface JobStatusResponse {
  jobId: string
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  progress: number
  result?: unknown
  error?: string
}

// ── Morale signals ────────────────────────────────────────────────────────────

export type MoraleSentiment = 'positive' | 'neutral' | 'negative' | 'mixed'
export type MoraleEngagement = 'high' | 'medium' | 'low'
export type MoraleWorkload = 'overloaded' | 'balanced' | 'underutilised' | 'unclear'
export type MoraleStress = 'none' | 'mild' | 'moderate' | 'high'
export type MoraleCollaboration = 'strong' | 'neutral' | 'weak'
export type MoraleTension = 'none' | 'mild' | 'notable'
export type MoraleEnergy = 'high' | 'medium' | 'low'

export interface PersonMoraleSignal {
  resourceId: string
  resourceName: string | null
  sentiment: MoraleSentiment
  engagementLevel: MoraleEngagement
  workloadSignal: MoraleWorkload
  stressSignal: MoraleStress
  signals: string[]
  rawQuotes: string[]
}

export interface TeamMoraleSummary {
  overallTeamSentiment: MoraleSentiment
  teamEnergy: MoraleEnergy
  collaborationSignal: MoraleCollaboration
  tensionSignal: MoraleTension
  aiObservation: string
}

export interface ExtractedMorale {
  personSignals: PersonMoraleSignal[]
  teamSummary: TeamMoraleSummary
}

// Morale history entry (from DB, includes standup date)
export interface MoraleHistoryEntry {
  standupId: string
  standupDate: string
  personSignals: (PersonMoraleSignal & { id: string })[]
  teamSummary: (TeamMoraleSummary & { id: string }) | null
}

// Task detail page response
export interface TaskDetailResponse {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  type: TaskUpdateType | null
  priority: TaskPriority | null
  taskCategory: TaskCategory | null
  complexity: TaskComplexity | null
  tags: string[]
  isClientFacing: boolean
  isBlocking: boolean
  blockedByDescription: string | null
  dependsOnDescription: string | null
  targetEnvironment: TargetEnvironment
  externalReferences: ExternalReference[]
  rawQuote: string | null
  resourceTaskCompletionConfidence: ResourceTaskCompletionConfidence | null
  isCarriedOver: boolean
  originalDeadlinePhrase: string | null
  resolvedDeadlineDate: string | null
  deadlineIsCompletion: boolean
  resourceEstimatedHours: number | null
  aiEstimatedHoursMin: number | null
  aiEstimatedHoursMax: number | null
  aiEstimateConfidence: 'low' | 'medium' | 'high' | null
  aiEstimateReasoning: string | null
  timesSlipped: number
  totalDaysSlipped: number
  aiMatchConfidence: 'low' | 'medium' | 'high' | null
  aiMatchReasoning: string | null
  aiExtractionConfidence: 'low' | 'medium' | 'high' | null
  standupMentionCount: number
  lastMentionedAt: string | null
  createdAt: string
  updatedAt: string
  saidBy: { id: string; name: string } | null
  assignees: Array<{ id: string; name: string; resourceType: string; addedAt: string }>
  history: TaskHistoryEntry[]
}

export interface TaskHistoryEntry {
  id: string
  actorLabel: string
  actorResourceId: string | null
  standupId: string | null
  changeType: string
  fieldName: string | null
  oldValue: unknown
  newValue: unknown
  note: string | null
  learntContext: string | null
  createdAt: string
}
