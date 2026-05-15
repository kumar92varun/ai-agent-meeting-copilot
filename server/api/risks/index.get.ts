import { getDb } from '../../db/client'
import { risks, projectLeads } from '../../db/schema'
import { and, eq, isNull, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string; role: string }
  const query = getQuery(event)
  const projectId = query.projectId as string | undefined
  const resourceId = query.resourceId as string | undefined
  const status = query.status as string | undefined
  const db = getDb()

  const conditions = [isNull(risks.deletedAt)]

  if (projectId) conditions.push(eq(risks.projectId, projectId))
  if (resourceId) conditions.push(eq(risks.resourceId, resourceId))
  if (status) conditions.push(eq(risks.status, status as 'open' | 'acknowledged' | 'resolved'))

  if (user.role !== 'admin') {
    const assigned = await db
      .select({ projectId: projectLeads.projectId })
      .from(projectLeads)
      .where(eq(projectLeads.userId, user.id))
    const ids = assigned.map((a) => a.projectId)
    if (!ids.length) return []
    conditions.push(inArray(risks.projectId as any, ids))
  }

  return db.select().from(risks).where(and(...conditions))
})
