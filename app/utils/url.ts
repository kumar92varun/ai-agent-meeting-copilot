/** Prefix an app-relative path with the app base URL. Use for raw fetch() and window.location, which don't add it. */
export function appUrl(path: string): string {
  return `${useRuntimeConfig().app.baseURL.replace(/\/+$/, '')}${path}`
}
