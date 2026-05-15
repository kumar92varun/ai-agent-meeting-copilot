import { getDb } from '../../db/client'
import { projectResources, resources } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const projectId = getQuery(event).projectId as string | undefined
  const db = getDb()

  const condition = projectId
    ? and(isNull(projectResources.deletedAt), eq(projectResources.projectId, projectId))
    : isNull(projectResources.deletedAt)

  return db.select().from(projectResources).where(condition)
})
