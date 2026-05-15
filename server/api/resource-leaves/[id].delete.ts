import { getDb } from '../../db/client'
import { resourceLeaves } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const id = getRouterParam(event, 'id')!
  const db = getDb()
  const [deleted] = await db
    .update(resourceLeaves)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(resourceLeaves.id, id), isNull(resourceLeaves.deletedAt)))
    .returning()

  if (!deleted) throw createError({ statusCode: 404, message: 'Leave not found' })
  return { ok: true }
})
