import { getDb } from '../../db/client'
import { projectResources, resources, projects } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const projectId = query.projectId as string | undefined
  const resourceId = query.resourceId as string | undefined
  const db = getDb()

  const conditions = [isNull(projectResources.deletedAt)]
  if (projectId) conditions.push(eq(projectResources.projectId, projectId))
  if (resourceId) conditions.push(eq(projectResources.resourceId, resourceId))

  return db
    .select({
      id: projectResources.id,
      projectId: projectResources.projectId,
      resourceId: projectResources.resourceId,
      allocationPct: projectResources.allocationPct,
      createdAt: projectResources.createdAt,
      updatedAt: projectResources.updatedAt,
      deletedAt: projectResources.deletedAt,
      resourceName: resources.name,
      resourceType: resources.resourceType,
      resourceRole: resources.role,
      resourceIsActive: resources.isActive,
      projectName: projects.name,
    })
    .from(projectResources)
    .innerJoin(resources, eq(projectResources.resourceId, resources.id))
    .innerJoin(projects, eq(projectResources.projectId, projects.id))
    .where(and(...conditions))
})
