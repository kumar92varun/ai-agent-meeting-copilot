import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { resources } from '../db/schema'

// Used when AUTH_DISABLED=true: every visitor is signed in as one shared admin account.
const GUEST_SUB = 'guest_admin'

let guestUser: { id: string; email: string | null; name: string; role: string; avatarUrl: string | null } | null = null

async function getGuestUser() {
  if (guestUser) return guestUser
  const db = getDb()
  await db
    .insert(resources)
    .values({ name: 'Guest Admin', googleSub: GUEST_SUB, role: 'admin' })
    .onConflictDoNothing({ target: resources.googleSub })
  const [row] = await db.select().from(resources).where(eq(resources.googleSub, GUEST_SUB)).limit(1)
  guestUser = { id: row.id, email: row.email, name: row.name, role: row.role, avatarUrl: row.avatarUrl }
  return guestUser
}

export function isAuthDisabled(): boolean {
  return useRuntimeConfig().public.authDisabled === true
}

export async function ensureGuestSession(event: H3Event) {
  const session = await getUserSession(event)
  if (session.user) return
  await setUserSession(event, { user: await getGuestUser() })
}
