import { getDb } from '../client'
import { users } from '../schema'
import { eq } from 'drizzle-orm'

export async function bootstrapAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  const name = process.env.BOOTSTRAP_ADMIN_NAME

  if (!email || !name) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_NAME must be set')
  }

  const db = getDb()
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (existing.length > 0) {
    console.log(`Admin user already exists: ${email}`)
    return existing[0]
  }

  const [admin] = await db
    .insert(users)
    .values({
      email,
      name,
      googleSub: `bootstrap_${Date.now()}`,
      role: 'admin',
    })
    .returning()

  console.log(`Bootstrap admin created: ${email} (id: ${admin.id})`)
  return admin
}
