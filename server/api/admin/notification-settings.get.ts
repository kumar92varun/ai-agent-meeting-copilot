import { getDb } from '../../db/client'
import { notificationSettings } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string }
  const db = getDb()

  const [settings] = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, user.id))
    .limit(1)

  return settings || null
})
