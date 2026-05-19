import { getDb } from '../../db/client'
import {
  standups,
  standupUpdates,
  resources,
  tasks,
  projectResourceTasks,
  risks,
  projectLeads,
  projectClientTeamMembers,
  projectTaskClientAssignments,
  standupMoraleSignals,
} from '../../db/schema'
import { and, eq, isNull, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string; role: string }
  const standupId = getRouterParam(event, 'id')!
  const db = getDb()

  const [standup] = await db
    .select()
    .from(standups)
    .where(and(eq(standups.id, standupId), isNull(standups.deletedAt)))
    .limit(1)

  if (!standup) throw createError({ statusCode: 404, message: 'Standup not found' })

  if (user.role !== 'admin') {
    const [lead] = await db
      .select()
      .from(projectLeads)
      .where(and(eq(projectLeads.projectId, standup.projectId), eq(projectLeads.userId, user.id)))
      .limit(1)
    if (!lead) throw createError({ statusCode: 403, message: 'Access denied' })
  }

  // Attendance with resource names
  const updates = await db
    .select({
      id: standupUpdates.id,
      resourceId: standupUpdates.resourceId,
      resourceName: resources.name,
      resourceType: resources.resourceType,
      attended: standupUpdates.attended,
      completedYesterdaySummary: standupUpdates.completedYesterdaySummary,
      workingTodaySummary: standupUpdates.workingTodaySummary,
      createdAt: standupUpdates.createdAt,
    })
    .from(standupUpdates)
    .innerJoin(resources, eq(standupUpdates.resourceId, resources.id))
    .where(eq(standupUpdates.standupId, standupId))

  // Tasks first mentioned in this standup — fields now live on project_tasks
  const standupTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      resourceId: projectResourceTasks.resourceId,
      resourceName: resources.name,
      resolvedDeadlineDate: tasks.resolvedDeadlineDate,
      resourceTaskCompletionConfidence: tasks.resourceTaskCompletionConfidence,
      aiEstimatedHoursMin: tasks.aiEstimatedHoursMin,
      aiEstimatedHoursMax: tasks.aiEstimatedHoursMax,
      aiEstimateConfidence: tasks.aiEstimateConfidence,
    })
    .from(tasks)
    .innerJoin(projectResourceTasks, and(
      eq(projectResourceTasks.taskId, tasks.id),
      isNull(projectResourceTasks.deletedAt),
    ))
    .innerJoin(resources, eq(projectResourceTasks.resourceId, resources.id))
    .where(and(eq(tasks.firstMentionedStandupId, standupId), isNull(tasks.deletedAt)))

  // Risks sourced from this standup
  const standupRisks = await db
    .select()
    .from(risks)
    .where(and(eq(risks.sourceStandupId, standupId), isNull(risks.deletedAt)))

  // Client team members first mentioned in this standup
  const clientMembers = await db
    .select()
    .from(projectClientTeamMembers)
    .where(eq(projectClientTeamMembers.firstMentionedStandupId, standupId))

  // Morale signals for this standup
  const moraleRows = await db
    .select()
    .from(standupMoraleSignals)
    .where(eq(standupMoraleSignals.standupId, standupId))
    .orderBy(asc(standupMoraleSignals.createdAt))

  const moralePersonSignals = moraleRows.filter((r) => r.resourceId !== null)
  const moraleTeamSummary = moraleRows.find((r) => r.resourceId === null) ?? null

  return {
    ...standup,
    updates,
    tasks: standupTasks,
    risks: standupRisks,
    clientMembers,
    morale: {
      personSignals: moralePersonSignals,
      teamSummary: moraleTeamSummary,
    },
  }
})
