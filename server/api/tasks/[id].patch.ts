import { getDb } from '../../db/client'
import { tasks } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['committed', 'in_progress', 'completed', 'overdue', 'carried_over', 'cancelled']).optional(),
})

export default defineEventHandler(async (event) => {
  await getUserSession(event) // auth check

  const taskId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const [updated] = await db
    .update(tasks)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Task not found' })
  return updated
})
