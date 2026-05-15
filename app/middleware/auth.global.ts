export default defineNuxtRouteMiddleware((to) => {
  if (to.path.startsWith('/api/')) return
  const { loggedIn } = useUserSession()
  if (!loggedIn.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
