import { getDb } from '../../db/client'
import { projects } from '../../db/schema'
import { AppError } from '../../utils/errors'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  quickTeamsLink: z.string().url().optional(),
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
      name: parsed.data.name,
      quickTeamsLink: parsed.data.quickTeamsLink || null,
    })
    .returning()

  return project
})
