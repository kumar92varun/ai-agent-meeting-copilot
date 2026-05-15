export default defineNuxtRouteMiddleware((to) => {
  const { user } = useUserSession()
  if (to.path.startsWith('/admin') && (user.value as { role?: string })?.role !== 'admin') {
    return navigateTo('/dashboard')
  }
})
