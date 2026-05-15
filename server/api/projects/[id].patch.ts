import { getDb } from '../../db/client'
import { projects } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const PatchProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quickTeamsLink: z.string().url().nullable().optional(),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { ...parsed.data, updatedAt: new Date() }
  const [updated] = await db
    .update(projects)
    .set(updates)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Project not found' })
  return updated
})
