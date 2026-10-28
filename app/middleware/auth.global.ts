export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/api/')) return
  if (useRuntimeConfig().public.authDisabled) {
    if (to.path === '/login') return navigateTo('/dashboard')
    return
  }
  const { loggedIn } = useUserSession()
  if (!loggedIn.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
