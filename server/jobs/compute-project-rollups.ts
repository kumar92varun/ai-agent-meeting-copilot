import { getDb } from '../db/client'
import { standups, tasks, projectResourceTasks, risks, standupUpdates, dailyMetricsProject } from '../db/schema'
import { eq, and, isNull, gte, lte, count, avg, sql } from 'drizzle-orm'
import { todayDateIST } from '../utils/dates'
import { logger } from '../utils/logger'

export interface ComputeProjectRollupsPayload {
  projectId: string
  date?: string // ISO date; defaults to today IST
}

export async function computeProjectRollups(payload: ComputeProjectRollupsPayload) {
  const db = getDb()
  const { projectId } = payload
  const metricDate = payload.date || todayDateIST()

  logger.info({ projectId, metricDate }, 'Computing project rollups')

  const [openRisks] = await db
    .select({ c: count() })
    .from(risks)
    .where(and(eq(risks.projectId, projectId), eq(risks.status, 'open'), isNull(risks.deletedAt)))

  const [overdueTasks] = await db
    .select({ c: count() })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, 'overdue'), isNull(tasks.deletedAt)))

  const [completedTasks] = await db
    .select({ c: count() })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, 'completed'), isNull(tasks.deletedAt)))

  const [standupsHeld] = await db
    .select({ c: count() })
    .from(standups)
    .where(and(eq(standups.projectId, projectId), eq(standups.standupDate, metricDate), isNull(standups.deletedAt)))

  // Attendance rate: attended / total for this date
  const attendanceData = await db
    .select({ attended: standupUpdates.attended })
    .from(standupUpdates)
    .innerJoin(standups, eq(standupUpdates.standupId, standups.id))
    .where(and(eq(standups.projectId, projectId), eq(standups.standupDate, metricDate)))

  const totalMembers = attendanceData.length
  const attendedCount = attendanceData.filter((r) => r.attended).length
  const attendanceRate = totalMembers > 0 ? attendedCount / totalMembers : 0

  // Average slippage from project_resource_tasks
  const slippageData = await db
    .select({ slippage: projectResourceTasks.totalDaysSlipped })
    .from(projectResourceTasks)
    .where(and(eq(projectResourceTasks.projectId, projectId), isNull(projectResourceTasks.deletedAt)))

  const avgSlippage =
    slippageData.length > 0
      ? slippageData.reduce((sum, r) => sum + (r.slippage || 0), 0) / slippageData.length
      : 0

  // Health score: simple weighted formula
  const healthScore = Math.max(
    0,
    100 -
      Number(openRisks.c) * 5 -
      Number(overdueTasks.c) * 10 -
      (1 - attendanceRate) * 20 -
      Math.min(avgSlippage * 2, 20)
  )

  await db
    .insert(dailyMetricsProject)
    .values({
      projectId,
      metricDate,
      healthScore,
      openRisksCount: Number(openRisks.c),
      overdueTasksCount: Number(overdueTasks.c),
      completedTasksCount: Number(completedTasks.c),
      standupsHeldCount: Number(standupsHeld.c),
      attendanceRate,
      avgSlippageDays: avgSlippage,
    })
    .onConflictDoUpdate({
      target: [dailyMetricsProject.projectId, dailyMetricsProject.metricDate],
      set: {
        healthScore,
        openRisksCount: Number(openRisks.c),
        overdueTasksCount: Number(overdueTasks.c),
        completedTasksCount: Number(completedTasks.c),
        standupsHeldCount: Number(standupsHeld.c),
        attendanceRate,
        avgSlippageDays: avgSlippage,
        updatedAt: new Date(),
      },
    })

  logger.info({ projectId, metricDate, healthScore }, 'Project rollups computed')
}
