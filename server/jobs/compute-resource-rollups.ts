import { getDb } from '../db/client'
import { projectResourceTasks, risks, standupUpdates, standups, dailyMetricsResource, tasks } from '../db/schema'
import { eq, and, isNull, count } from 'drizzle-orm'
import { todayDateIST } from '../utils/dates'
import { logger } from '../utils/logger'

export interface ComputeResourceRollupsPayload {
  resourceId: string
  date?: string
}

export async function computeResourceRollups(payload: ComputeResourceRollupsPayload) {
  const db = getDb()
  const { resourceId } = payload
  const metricDate = payload.date || todayDateIST()

  logger.info({ resourceId, metricDate }, 'Computing resource rollups')

  const attendanceRows = await db
    .select({ attended: standupUpdates.attended })
    .from(standupUpdates)
    .innerJoin(standups, eq(standupUpdates.standupId, standups.id))
    .where(and(eq(standupUpdates.resourceId, resourceId), eq(standups.standupDate, metricDate)))

  const attendanceRate =
    attendanceRows.length > 0
      ? attendanceRows.filter((r) => r.attended).length / attendanceRows.length
      : 0

  // Tasks assigned to this resource — read all fields from project_tasks now
  const taskRows = await db
    .select({
      status: tasks.status,
      totalDaysSlipped: tasks.totalDaysSlipped,
      resourceEstimatedHours: tasks.resourceEstimatedHours,
      aiEstimatedHoursMin: tasks.aiEstimatedHoursMin,
      aiEstimatedHoursMax: tasks.aiEstimatedHoursMax,
    })
    .from(projectResourceTasks)
    .innerJoin(tasks, eq(projectResourceTasks.taskId, tasks.id))
    .where(and(
      eq(projectResourceTasks.resourceId, resourceId),
      isNull(projectResourceTasks.deletedAt),
      isNull(tasks.deletedAt)
    ))

  const tasksCommitted = taskRows.length
  const tasksCompletedOnTime = taskRows.filter(
    (r) => r.status === 'completed' && r.totalDaysSlipped === 0
  ).length
  const tasksSlipped = taskRows.filter((r) => r.totalDaysSlipped > 0).length

  const totalEstimatedHours = taskRows.reduce(
    (sum, r) => sum + (r.resourceEstimatedHours || 0),
    0
  )
  const totalAiMidpoint = taskRows.reduce(
    (sum, r) => sum + ((r.aiEstimatedHoursMin || 0) + (r.aiEstimatedHoursMax || 0)) / 2,
    0
  )

  const [resourceRisks] = await db
    .select({ c: count() })
    .from(risks)
    .where(and(eq(risks.resourceId, resourceId), eq(risks.status, 'open'), isNull(risks.deletedAt)))

  await db
    .insert(dailyMetricsResource)
    .values({
      resourceId,
      metricDate,
      attendanceRate,
      tasksCommitted,
      tasksCompletedOnTime,
      tasksSlipped,
      totalEstimatedHours,
      totalAiEstimatedHoursMidpoint: totalAiMidpoint,
      risksCount: Number(resourceRisks.c),
    })
    .onConflictDoUpdate({
      target: [dailyMetricsResource.resourceId, dailyMetricsResource.metricDate],
      set: {
        attendanceRate,
        tasksCommitted,
        tasksCompletedOnTime,
        tasksSlipped,
        totalEstimatedHours,
        totalAiEstimatedHoursMidpoint: totalAiMidpoint,
        risksCount: Number(resourceRisks.c),
        updatedAt: new Date(),
      },
    })

  logger.info({ resourceId, metricDate }, 'Resource rollups computed')
}
