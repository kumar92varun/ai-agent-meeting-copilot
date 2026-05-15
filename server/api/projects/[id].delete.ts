import { getDb } from '../../db/client'
import { projects } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const projectId = getRouterParam(event, 'id')!
  const db = getDb()

  const [deleted] = await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning()

  if (!deleted) throw createError({ statusCode: 404, message: 'Project not found' })
  return { ok: true }
})
