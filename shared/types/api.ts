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

// Standup analyze request/response (SSE stream events)
export interface AnalyzeStandupRequest {
  projectId: string
  standupDate: string // ISO date string
  transcript: string
}

export interface StandupStreamEvent {
  type: 'progress' | 'result' | 'error' | 'done'
  node?: string
  message?: string
  data?: ExtractionResult
  error?: string
}

// The full extraction result returned after analysis
export interface ExtractionResult {
  attendance: AttendanceItem[]
  identifiedClientMembers: IdentifiedClientMember[]
  tasks: ExtractedTask[]
  risks: ExtractedRisk[]
  llmModelUsed: string
  tokensIn: number
  tokensOut: number
  processingDurationMs: number
}

export interface AttendanceItem {
  resourceId: string
  resourceName: string
  attended: boolean
  rawQuote: string | null
}

export interface IdentifiedClientMember {
  name: string
  inferredRole: string | null
}

export interface TaskClientLink {
  clientMemberName: string
  assignmentType: 'assigned_by' | 'mentioned_by' | 'reviewing'
}

export interface ExtractedTask {
  // null = new task; uuid = existing task to update
  existingTaskId: string | null
  title: string
  description: string | null
  resourceId: string
  resolvedDeadlineDate: string | null
  originalDeadlinePhrase: string | null
  resourceEstimatedHours: number | null
  aiEstimatedHoursMin: number | null
  aiEstimatedHoursMax: number | null
  aiEstimateConfidence: 'low' | 'medium' | 'high' | null
  aiEstimateReasoning: string | null
  commitmentConfidence: 'firm' | 'vague' | 'aspirational'
  isCompleted: boolean
  isCarriedOver: boolean
  rawQuote: string | null
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

// Save standup request body
export interface SaveStandupRequest {
  projectId: string
  standupDate: string
  rawTranscript: string
  extraction: ExtractionResult
}

// Metrics query params
export interface MetricsPeriodParams {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  from?: string
  to?: string
}

// Job status response
export interface JobStatusResponse {
  jobId: string
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
  progress: number
  result?: unknown
  error?: string
}
