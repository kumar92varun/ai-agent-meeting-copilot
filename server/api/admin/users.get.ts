import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const db = getDb()
  return db.select().from(resources).where(isNull(resources.deletedAt))
})
