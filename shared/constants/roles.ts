export const ROLES = {
  ADMIN: 'admin',
  PROJECT_LEAD: 'project_lead',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  project_lead: 'Project Lead',
}
