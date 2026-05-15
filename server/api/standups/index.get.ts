import { getDb } from '../../db/client'
import { standups, projectLeads } from '../../db/schema'
import { and, eq, isNull, inArray, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string; role: string }
  const query = getQuery(event)
  const projectId = query.projectId as string | undefined

  const db = getDb()

  if (user.role === 'admin') {
    const cond = projectId
      ? and(isNull(standups.deletedAt), eq(standups.projectId, projectId))
      : isNull(standups.deletedAt)
    return db.select().from(standups).where(cond).orderBy(desc(standups.standupDate))
  }

  const assigned = await db
    .select({ projectId: projectLeads.projectId })
    .from(projectLeads)
    .where(eq(projectLeads.userId, user.id))

  if (!assigned.length) return []
  const ids = assigned.map((a) => a.projectId)

  const cond = projectId
    ? and(isNull(standups.deletedAt), eq(standups.projectId, projectId), inArray(standups.projectId, ids))
    : and(isNull(standups.deletedAt), inArray(standups.projectId, ids))

  return db.select().from(standups).where(cond).orderBy(desc(standups.standupDate))
})
