import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = getDb()
  return db.select().from(resources).where(isNull(resources.deletedAt))
})
