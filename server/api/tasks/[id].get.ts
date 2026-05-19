import { getDb } from '../../db/client'
import { tasks, projectResourceTasks, resources, taskHistory } from '../../db/schema'
import { eq, and, isNull, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await getUserSession(event)

  const taskId = getRouterParam(event, 'id')
  if (!taskId) throw createError({ statusCode: 400, message: 'Task ID required' })

  const db = getDb()

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
    .limit(1)

  if (!task) throw createError({ statusCode: 404, message: 'Task not found' })

  // Assignees
  const assigneeRows = await db
    .select({
      id: resources.id,
      name: resources.name,
      resourceType: resources.resourceType,
      addedAt: projectResourceTasks.createdAt,
    })
    .from(projectResourceTasks)
    .innerJoin(resources, eq(projectResourceTasks.resourceId, resources.id))
    .where(and(eq(projectResourceTasks.taskId, taskId), isNull(projectResourceTasks.deletedAt)))

  // Said by
  let saidBy: { id: string; name: string } | null = null
  if (task.saidByResourceId) {
    const [speaker] = await db
      .select({ id: resources.id, name: resources.name })
      .from(resources)
      .where(eq(resources.id, task.saidByResourceId))
      .limit(1)
    if (speaker) saidBy = speaker
  }

  // Full history
  const history = await db
    .select()
    .from(taskHistory)
    .where(eq(taskHistory.taskId, taskId))
    .orderBy(asc(taskHistory.createdAt))

  return {
    ...task,
    saidBy,
    assignees: assigneeRows.map((r) => ({
      id: r.id,
      name: r.name,
      resourceType: r.resourceType,
      addedAt: r.addedAt.toISOString(),
    })),
    history: history.map((h) => ({
      id: h.id,
      actorLabel: h.actorLabel,
      actorResourceId: h.actorResourceId,
      standupId: h.standupId,
      changeType: h.changeType,
      fieldName: h.fieldName,
      oldValue: h.oldValue,
      newValue: h.newValue,
      note: h.note,
      learntContext: h.learntContext,
      createdAt: h.createdAt.toISOString(),
    })),
  }
})
