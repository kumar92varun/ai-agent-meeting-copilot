import { getDb } from '../../../db/client'
import { resources, projectLeads } from '../../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({
  role: z.enum(['admin', 'project_lead']).optional(),
  name: z.string().optional(),
  projectIds: z.array(z.string().uuid()).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const actor = session.user as { role: string }
  if (actor.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const userId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.role) updates.role = parsed.data.role
  if (parsed.data.name) updates.name = parsed.data.name

  const [updated] = await db
    .update(resources)
    .set(updates)
    .where(and(eq(resources.id, userId), isNull(resources.deletedAt)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'User not found' })

  if (parsed.data.projectIds !== undefined) {
    await db.delete(projectLeads).where(eq(projectLeads.userId, userId))
    if (parsed.data.projectIds.length) {
      await db.insert(projectLeads).values(
        parsed.data.projectIds.map((projectId) => ({ projectId, userId }))
      )
    }
  }

  return updated
})
