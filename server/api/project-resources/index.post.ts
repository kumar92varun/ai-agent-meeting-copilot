import { getDb } from '../../db/client'
import { projectResources } from '../../db/schema'
import { z } from 'zod'

const Schema = z.object({
  projectId: z.string().uuid(),
  resourceId: z.string().uuid(),
  allocationPct: z.number().int().min(1).max(100).default(100),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const [row] = await db
    .insert(projectResources)
    .values(parsed.data)
    .returning()

  return row
})
