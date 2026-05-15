import { getDb } from '../../db/client'
import { projects } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const PatchProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  clientName: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  sprintCadenceDays: z.number().int().min(1).max(90).optional(),
  startedAt: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const projectId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const parsed = PatchProjectSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const { startedAt, ...rest } = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { ...rest, updatedAt: new Date() }
  if (startedAt !== undefined) updates.startedAt = new Date(startedAt)
  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Project not found' })
  return updated
})
