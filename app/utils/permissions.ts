// Client-side UI gating only — server is the source of truth

export function isAdmin(role: string | undefined): boolean {
  return role === 'admin'
}

export function canManageProject(role: string | undefined): boolean {
  return role === 'admin'
}
