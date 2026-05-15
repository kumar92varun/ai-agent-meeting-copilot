import { getDb } from '../../db/client'
import { resourceLeaves } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const resourceId = getQuery(event).resourceId as string | undefined
  const db = getDb()

  const condition = resourceId
    ? and(isNull(resourceLeaves.deletedAt), eq(resourceLeaves.resourceId, resourceId))
    : isNull(resourceLeaves.deletedAt)

  return db.select().from(resourceLeaves).where(condition)
})
