import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const db = getDb()
  return db.select().from(users).where(isNull(users.deletedAt))
})
