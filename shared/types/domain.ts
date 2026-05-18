import type { RiskCategory, RiskSeverity, RiskStatus } from '../constants/risk-categories'

export interface Project {
  id: string
  name: string
  quickTeamsLink: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Resource {
  id: string
  name: string
  email: string | null
  googleSub: string
  role: 'admin' | 'project_lead' | 'project_member'
  avatarUrl: string | null
  lastLoginAt: string | null
  resourceType: 'developer' | 'designer' | 'qa' | 'devops'
  isActive: boolean
  quickTeamsLink: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ProjectResource {
  id: string
  projectId: string
  resourceId: string
  allocationPct: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  // joined fields
  resourceName: string
  resourceType: string
  resourceRole: string
  resourceIsActive: boolean
  projectName: string
}

export interface Standup {
  id: string
  projectId: string
  standupDate: string
  rawTranscript: string
  ingestedByUserId: string
  extractionStatus: 'pending' | 'analyzing' | 'reviewed' | 'saved' | 'failed'
  llmModelUsed: string | null
  tokensIn: number | null
  tokensOut: number | null
  processingDurationMs: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface StandupUpdate {
  id: string
  standupId: string
  resourceId: string
  attended: boolean
  completedYesterdaySummary: string | null
  workingTodaySummary: string | null
  committedTaskIds: string[]
  completedTaskIds: string[]
  missedTaskIds: string[]
  rawQuote: string | null
  createdAt: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: 'committed' | 'in_progress' | 'completed' | 'overdue' | 'carried_over' | 'cancelled'
  firstMentionedStandupId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface ProjectResourceTask {
  id: string
  taskId: string
  resourceId: string
  projectId: string
  resourceEstimatedHours: number | null
  aiEstimatedHoursMin: number | null
  aiEstimatedHoursMax: number | null
  aiEstimateConfidence: 'low' | 'medium' | 'high' | null
  aiEstimateReasoning: string | null
  originalDeadlinePhrase: string | null
  resolvedDeadlineDate: string | null
  commitmentConfidence: 'firm' | 'vague' | 'aspirational' | null
  timesDeadlineExtended: number
  totalDaysSlipped: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface Risk {
  id: string
  riskType: 'project' | 'resource'
  projectId: string | null
  resourceId: string | null
  category: RiskCategory
  severity: RiskSeverity
  title: string
  description: string
  aiReasoning: string
  sourceStandupId: string | null
  sourceRawQuote: string | null
  status: RiskStatus
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  resolutionNotes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface DailyMetricsProject {
  id: string
  projectId: string
  metricDate: string
  healthScore: number
  openRisksCount: number
  overdueTasksCount: number
  completedTasksCount: number
  standupsHeldCount: number
  attendanceRate: number
  avgSlippageDays: number
  createdAt: string
  updatedAt: string
}

export interface DailyMetricsResource {
  id: string
  resourceId: string
  metricDate: string
  attendanceRate: number
  tasksCommitted: number
  tasksCompletedOnTime: number
  tasksSlipped: number
  avgEstimateAccuracyPct: number | null
  totalEstimatedHours: number
  totalAiEstimatedHoursMidpoint: number
  risksCount: number
  createdAt: string
  updatedAt: string
}

export interface NotificationSetting {
  id: string
  userId: string
  dailyRiskDigestEnabled: boolean
  immediateRiskAlertEnabled: boolean
  severityThreshold: RiskSeverity
  createdAt: string
  updatedAt: string
}
