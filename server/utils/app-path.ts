// Helpers for running the app under a sub-path (NUXT_APP_BASE_URL, e.g. /ai-agents/standup-copilot/).

/** App base path without trailing slash ('' when served at the domain root). */
export function appBase(): string {
  return (useRuntimeConfig().app.baseURL || '/').replace(/\/+$/, '')
}

/** Remove the app base from a request pathname so route checks can use '/api/...'. */
export function stripAppBase(pathname: string): string {
  const base = appBase()
  if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
    return pathname.slice(base.length) || '/'
  }
  return pathname
}

/** Prefix an app-relative path (starting with '/') with the app base, for redirects. */
export function withAppBase(path: string): string {
  return `${appBase()}${path}`
}
