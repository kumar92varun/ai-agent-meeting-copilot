// Nuxt SSR calls router.resolve() for every request (including Nitro API routes)
// before handing off to Nitro. Vue Router warns when it can't match /api/** paths
// as page routes. This suppresses that specific dev-mode noise.
export default defineNuxtPlugin(() => {
  if (!import.meta.dev) return
  const original = console.warn
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('No match found for location with path') &&
      args[0].includes('/api/')
    ) return
    original.apply(console, args)
  }
})
