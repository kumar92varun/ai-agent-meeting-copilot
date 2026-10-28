export default defineEventHandler(async (event) => {
  const pathname = stripAppBase(getRequestURL(event).pathname)

  // Build assets never need a session
  if (pathname.startsWith('/_nuxt/') || pathname.startsWith('/__nuxt')) return

  // Open-access mode: sign every visitor in as the shared guest admin
  if (isAuthDisabled()) {
    await ensureGuestSession(event)
    return
  }

  // Skip auth for public routes
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health' ||
    pathname === '/login'
  ) {
    return
  }

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) return

  await requireUserSession(event)
})
