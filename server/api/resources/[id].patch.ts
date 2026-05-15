import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const PatchResourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  roleTitle: z.string().max(200).optional(),
  resourceType: z.enum(['developer', 'designer', 'qa', 'devops']).optional(),
  joinedAt: z.string().optional(),
  isActive: z.boolean().optional(),
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
  const { joinedAt, ...rest } = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { ...rest, updatedAt: new Date() }
  if (joinedAt !== undefined) updates.joinedAt = new Date(joinedAt)
  const [updated] = await db
    .update(resources)
    .set(updates)
    .where(and(eq(resources.id, resourceId), isNull(resources.deletedAt)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Resource not found' })
  return updated
})
