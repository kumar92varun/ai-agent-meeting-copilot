import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const PatchResourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  resourceType: z.enum(['developer', 'designer', 'qa', 'devops']).optional(),
  isActive: z.boolean().optional(),
  quickTeamsLink: z.string().url().nullable().optional(),
  role: z.enum(['admin', 'project_lead']).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const resourceId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const parsed = PatchResourceSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { ...parsed.data, updatedAt: new Date() }
  const [updated] = await db
    .update(resources)
    .set(updates)
    .where(and(eq(resources.id, resourceId), isNull(resources.deletedAt)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Resource not found' })
  return updated
})
