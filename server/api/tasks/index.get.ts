import { getDb } from '../../db/client'
import { tasks, projectResourceTasks } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const projectId = query.projectId as string | undefined
  const resourceId = query.resourceId as string | undefined
  const db = getDb()

  if (resourceId) {
    return db
      .select({ task: tasks, assignment: projectResourceTasks })
      .from(tasks)
      .innerJoin(
        projectResourceTasks,
        and(eq(projectResourceTasks.taskId, tasks.id), isNull(projectResourceTasks.deletedAt))
      )
      .where(and(isNull(tasks.deletedAt), eq(projectResourceTasks.resourceId, resourceId)))
  }

  const cond = projectId
    ? and(isNull(tasks.deletedAt), eq(tasks.projectId, projectId))
    : isNull(tasks.deletedAt)

  return db.select().from(tasks).where(cond)
})
