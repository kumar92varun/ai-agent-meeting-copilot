import { getDb } from '../../db/client'
import { projects } from '../../db/schema'
import { AppError } from '../../utils/errors'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  clientName: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed']).default('active'),
  sprintCadenceDays: z.number().int().min(1).max(90).default(14),
  startedAt: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }

  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin only' })
  }

  const body = await readBody(event)
  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const db = getDb()
  const [project] = await db
    .insert(projects)
    .values({
      ...parsed.data,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : null,
    })
    .returning()

  return project
})
