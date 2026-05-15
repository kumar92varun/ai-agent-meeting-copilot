import { getDb } from '../../db/client'
import { projects, projectLeads } from '../../db/schema'
import { isNull, eq, and, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string; role: string }
  const db = getDb()

  if (user.role === 'admin') {
    return db.select().from(projects).where(isNull(projects.deletedAt))
  }

  // project_lead: only assigned projects
  const assigned = await db
    .select({ projectId: projectLeads.projectId })
    .from(projectLeads)
    .where(eq(projectLeads.userId, user.id))

  if (!assigned.length) return []

  const ids = assigned.map((a) => a.projectId)
  return db
    .select()
    .from(projects)
    .where(and(isNull(projects.deletedAt), inArray(projects.id, ids)))
})
