import { getDb } from '../db/client'
import { tasks, risks } from '../db/schema'
import { eq, and, isNull, lte, ne } from 'drizzle-orm'
import { todayDateIST } from '../utils/dates'
import { logger } from '../utils/logger'

export async function checkDeadlineCompletions() {
  const db = getDb()
  const today = todayDateIST()

  const overdueTasks = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      resolvedDeadlineDate: tasks.resolvedDeadlineDate,
      timesSlipped: tasks.timesSlipped,
    })
    .from(tasks)
    .where(
      and(
        isNull(tasks.deletedAt),
        ne(tasks.status, 'completed'),
        ne(tasks.status, 'cancelled'),
        lte(tasks.resolvedDeadlineDate, today)
      )
    )

  for (const task of overdueTasks) {
    await db
      .update(tasks)
      .set({ status: 'overdue', updatedAt: new Date() })
      .where(eq(tasks.id, task.id))

    const existingRisk = await db
      .select()
      .from(risks)
      .where(
        and(
          eq(risks.projectId, task.projectId),
          eq(risks.category, 'missed_deadline'),
          eq(risks.status, 'open'),
          isNull(risks.deletedAt)
        )
      )
      .limit(1)

    if (!existingRisk.length) {
      await db.insert(risks).values({
        riskType: 'project',
        projectId: task.projectId,
        resourceId: null,
        category: 'missed_deadline',
        severity: task.timesSlipped >= 2 ? 'high' : 'medium',
        title: 'Task deadline missed',
        description: `Task (id: ${task.id}) passed its deadline of ${task.resolvedDeadlineDate} without being completed.`,
        aiReasoning: `Automated check: deadline ${task.resolvedDeadlineDate} passed. Slipped ${task.timesSlipped} time(s) previously.`,
        status: 'open',
      })
    }

    logger.info({ taskId: task.id }, 'Marked task as overdue')
  }

  logger.info({ count: overdueTasks.length }, 'Deadline completion check done')
}
