import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const resourceId = getRouterParam(event, 'id')!
  const db = getDb()
  const [resource] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), isNull(resources.deletedAt)))
    .limit(1)

  if (!resource) throw createError({ statusCode: 404, message: 'Resource not found' })
  return resource
})
