import { getDb } from '../../db/client'
import { notificationSettings } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({
  dailyRiskDigestEnabled: z.boolean().optional(),
  immediateRiskAlertEnabled: z.boolean().optional(),
  severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string }
  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const existing = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, user.id))
    .limit(1)

  if (existing.length) {
    const [updated] = await db
      .update(notificationSettings)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(notificationSettings.userId, user.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(notificationSettings)
    .values({ userId: user.id, ...parsed.data })
    .returning()

  return created
})
