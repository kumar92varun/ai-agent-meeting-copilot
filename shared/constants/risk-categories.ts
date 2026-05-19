export const RISK_CATEGORIES = {
  MISSED_DEADLINE: 'missed_deadline',
  FREQUENT_SLIPPAGE: 'frequent_slippage',
  LOW_ATTENDANCE: 'low_attendance',
  VAGUE_UPDATES: 'vague_updates',
  BLOCKER_UNRESOLVED: 'blocker_unresolved',
  ESTIMATE_MISMATCH: 'estimate_mismatch',
  VAGUE_COMMITMENT: 'vague_commitment',
  SUSTAINED_LOW_MORALE: 'sustained_low_morale',
  TEAM_TENSION: 'team_tension',
  OTHER: 'other',
} as const

export type RiskCategory = (typeof RISK_CATEGORIES)[keyof typeof RISK_CATEGORIES]

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  missed_deadline: 'Missed Deadline',
  frequent_slippage: 'Frequent Slippage',
  low_attendance: 'Low Attendance',
  vague_updates: 'Vague Updates',
  blocker_unresolved: 'Blocker Unresolved',
  estimate_mismatch: 'Estimate Mismatch',
  vague_commitment: 'Vague Commitment',
  sustained_low_morale: 'Sustained Low Morale',
  team_tension: 'Team Tension',
  other: 'Other',
}

export const RISK_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export type RiskSeverity = (typeof RISK_SEVERITIES)[number]

export const RISK_SEVERITY_COLORS: Record<RiskSeverity, string> = {
  low: 'blue',
  medium: 'yellow',
  high: 'orange',
  critical: 'red',
}

export const RISK_STATUSES = ['open', 'acknowledged', 'resolved'] as const
export type RiskStatus = (typeof RISK_STATUSES)[number]
