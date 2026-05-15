import { getDb } from '../db/client'
import { tasks, projectResourceTasks, risks } from '../db/schema'
import { eq, and, isNull, lte, ne } from 'drizzle-orm'
import { todayDateIST } from '../utils/dates'
import { logger } from '../utils/logger'

export async function checkDeadlineCompletions() {
  const db = getDb()
  const today = todayDateIST()

  // Find tasks past their deadline that are not yet completed/cancelled
  const overdueAssignments = await db
    .select({
      taskId: projectResourceTasks.taskId,
      projectId: projectResourceTasks.projectId,
      resourceId: projectResourceTasks.resourceId,
      resolvedDeadlineDate: projectResourceTasks.resolvedDeadlineDate,
      timesExtended: projectResourceTasks.timesDeadlineExtended,
    })
    .from(projectResourceTasks)
    .innerJoin(tasks, eq(projectResourceTasks.taskId, tasks.id))
    .where(
      and(
        isNull(projectResourceTasks.deletedAt),
        isNull(tasks.deletedAt),
        ne(tasks.status, 'completed'),
        ne(tasks.status, 'cancelled'),
        lte(projectResourceTasks.resolvedDeadlineDate, today)
      )
    )

  for (const assignment of overdueAssignments) {
    // Mark task as overdue
    await db
      .update(tasks)
      .set({ status: 'overdue', updatedAt: new Date() })
      .where(eq(tasks.id, assignment.taskId))

    // Raise a missed_deadline risk if not already raised
    const existingRisk = await db
      .select()
      .from(risks)
      .where(
        and(
          eq(risks.resourceId, assignment.resourceId),
          eq(risks.category, 'missed_deadline'),
          eq(risks.status, 'open'),
          isNull(risks.deletedAt)
        )
      )
      .limit(1)

    if (!existingRisk.length) {
      await db.insert(risks).values({
        riskType: 'resource',
        projectId: assignment.projectId,
        resourceId: assignment.resourceId,
        category: 'missed_deadline',
        severity: assignment.timesExtended >= 2 ? 'high' : 'medium',
        title: 'Task deadline missed',
        description: `Task (id: ${assignment.taskId}) passed its deadline of ${assignment.resolvedDeadlineDate} without being completed.`,
        aiReasoning: `Automated check: task deadline ${assignment.resolvedDeadlineDate} passed with no completion recorded. Extended ${assignment.timesExtended} time(s) previously.`,
        status: 'open',
      })
    }

    logger.info({ taskId: assignment.taskId }, 'Marked task as overdue')
  }

  logger.info({ count: overdueAssignments.length }, 'Deadline completion check done')
}
