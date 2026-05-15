import { getDb } from '../../db/client'
import { resourceLeaves } from '../../db/schema'
import { z } from 'zod'

const Schema = z.object({
  resourceId: z.string().uuid(),
  leaveType: z.enum(['pto', 'sick', 'personal', 'training']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const [row] = await db.insert(resourceLeaves).values(parsed.data).returning()
  return row
})
