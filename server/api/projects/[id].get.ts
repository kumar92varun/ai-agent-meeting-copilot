import { getDb } from '../../db/client'
import { projects, projectLeads } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string; role: string }
  const projectId = getRouterParam(event, 'id')!

  const db = getDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' })

  if (user.role !== 'admin') {
    const [lead] = await db
      .select()
      .from(projectLeads)
      .where(and(eq(projectLeads.projectId, projectId), eq(projectLeads.userId, user.id)))
      .limit(1)

    if (!lead) throw createError({ statusCode: 403, message: 'Access denied' })
  }

  return project
})
