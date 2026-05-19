import { getDb } from '../../../db/client'
import { projectResources, resources } from '../../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await getUserSession(event)
  const projectId = getRouterParam(event, 'id')
  if (!projectId) throw createError({ statusCode: 400, message: 'Project ID required' })

  const db = getDb()
  const rows = await db
    .select({
      id: resources.id,
      name: resources.name,
      resourceType: resources.resourceType,
    })
    .from(projectResources)
    .innerJoin(resources, eq(projectResources.resourceId, resources.id))
    .where(and(eq(projectResources.projectId, projectId), isNull(projectResources.deletedAt)))

  return rows
})
