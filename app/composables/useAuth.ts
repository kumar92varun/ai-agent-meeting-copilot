export function useAuth() {
  const { user, loggedIn, clear, fetch: refreshSession } = useUserSession()

  const isAdmin = computed(() => (user.value as { role?: string } | null)?.role === 'admin')
  const isProjectLead = computed(
    () => (user.value as { role?: string } | null)?.role === 'project_lead'
  )

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/login')
  }

  return { user, loggedIn, isAdmin, isProjectLead, logout, refreshSession }
}
