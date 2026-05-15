
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Skip auth for public routes
  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname === '/api/health' ||
    url.pathname === '/login'
  ) {
    return
  }

  // Only apply to API routes
  if (!url.pathname.startsWith('/api/')) return

  await requireUserSession(event)
})
