import type { Role } from '../../shared/constants/roles'

export function canAccessProject(
  userRole: Role,
  userId: string,
  projectId: string,
  assignedProjectIds: string[]
): boolean {
  if (userRole === 'admin') return true
  return assignedProjectIds.includes(projectId)
}

export function isAdmin(role: Role): boolean {
  return role === 'admin'
}

export function isProjectLead(role: Role): boolean {
  return role === 'project_lead'
}
