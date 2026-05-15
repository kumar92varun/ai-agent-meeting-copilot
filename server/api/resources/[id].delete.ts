import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const resourceId = getRouterParam(event, 'id')!
  const db = getDb()
  const [deleted] = await db
    .update(resources)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(resources.id, resourceId), isNull(resources.deletedAt)))
    .returning()

  if (!deleted) throw createError({ statusCode: 404, message: 'Resource not found' })
  return { ok: true }
})
