import { getDb } from '../../db/client'
import { standups, standupUpdates, projectLeads } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string; role: string }
  const standupId = getRouterParam(event, 'id')!
  const db = getDb()

  const [standup] = await db
    .select()
    .from(standups)
    .where(and(eq(standups.id, standupId), isNull(standups.deletedAt)))
    .limit(1)

  if (!standup) throw createError({ statusCode: 404, message: 'Standup not found' })

  if (user.role !== 'admin') {
    const [lead] = await db
      .select()
      .from(projectLeads)
      .where(and(eq(projectLeads.projectId, standup.projectId), eq(projectLeads.userId, user.id)))
      .limit(1)
    if (!lead) throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const updates = await db
    .select()
    .from(standupUpdates)
    .where(eq(standupUpdates.standupId, standupId))

  return { ...standup, updates }
})
