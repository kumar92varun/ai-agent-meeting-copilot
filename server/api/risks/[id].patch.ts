import { getDb } from '../../db/client'
import { risks } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  resolutionNotes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string }
  const riskId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() }

  if (parsed.data.status === 'acknowledged') {
    updates.acknowledgedBy = user.id
    updates.acknowledgedAt = new Date()
  }

  const [updated] = await db
    .update(risks)
    .set(updates)
    .where(and(eq(risks.id, riskId), isNull(risks.deletedAt)))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Risk not found' })
  return updated
})
