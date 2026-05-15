import { getDb } from '../../db/client'
import {
  standups,
  standupUpdates,
  tasks,
  projectResourceTasks,
  risks,
  notificationSettings,
} from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import {
  computeProjectRollupsQueue,
  computeResourceRollupsQueue,
  generateEmbeddingQueue,
  sendNotificationEmailQueue,
} from '../../jobs/queues'
import type { SaveStandupRequest } from '../../../shared/types/api'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string }

  const body: SaveStandupRequest = await readBody(event)
  const db = getDb()

  // Persist everything in a transaction
  const [standup] = await db
    .insert(standups)
    .values({
      projectId: body.projectId,
      standupDate: body.standupDate,
      rawTranscript: body.rawTranscript,
      ingestedByUserId: user.id,
      extractionStatus: 'saved',
      llmModelUsed: body.extraction.llmModelUsed,
      tokensIn: body.extraction.tokensIn,
      tokensOut: body.extraction.tokensOut,
      processingDurationMs: body.extraction.processingDurationMs,
    })
    .returning()

  const affectedResourceIds = new Set<string>()

  // Persist attendance
  for (const att of body.extraction.attendance) {
    await db.insert(standupUpdates).values({
      standupId: standup.id,
      resourceId: att.resourceId,
      attended: att.attended,
    })
    affectedResourceIds.add(att.resourceId)
  }

  // Persist tasks
  for (const extracted of body.extraction.tasks) {
    let taskId = extracted.existingTaskId

    if (!taskId) {
      const [newTask] = await db
        .insert(tasks)
        .values({
          projectId: body.projectId,
          title: extracted.title,
          description: extracted.description || null,
          status: extracted.isCompleted ? 'completed' : 'committed',
          firstMentionedStandupId: standup.id,
        })
        .returning()
      taskId = newTask.id
    } else if (extracted.isCompleted) {
      await db
        .update(tasks)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(tasks.id, taskId))
    }

    const [existingAssignment] = await db
      .select()
      .from(projectResourceTasks)
      .where(
        and(
          eq(projectResourceTasks.taskId, taskId),
          eq(projectResourceTasks.resourceId, extracted.resourceId),
          isNull(projectResourceTasks.deletedAt)
        )
      )
      .limit(1)

    if (existingAssignment) {
      await db
        .update(projectResourceTasks)
        .set({
          resolvedDeadlineDate: extracted.resolvedDeadlineDate || undefined,
          resourceEstimatedHours: extracted.resourceEstimatedHours || undefined,
          commitmentConfidence: extracted.commitmentConfidence || undefined,
          completedAt: extracted.isCompleted ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(projectResourceTasks.id, existingAssignment.id))
    } else {
      await db.insert(projectResourceTasks).values({
        taskId,
        resourceId: extracted.resourceId,
        projectId: body.projectId,
        resourceEstimatedHours: extracted.resourceEstimatedHours || null,
        aiEstimatedHoursMin: extracted.aiEstimatedHoursMin || null,
        aiEstimatedHoursMax: extracted.aiEstimatedHoursMax || null,
        aiEstimateConfidence: extracted.aiEstimateConfidence || null,
        aiEstimateReasoning: extracted.aiEstimateReasoning || null,
        originalDeadlinePhrase: extracted.originalDeadlinePhrase || null,
        resolvedDeadlineDate: extracted.resolvedDeadlineDate || null,
        commitmentConfidence: extracted.commitmentConfidence || null,
        completedAt: extracted.isCompleted ? new Date() : null,
      })
    }

    affectedResourceIds.add(extracted.resourceId)
  }

  // Persist risks
  const immediateSeverities = ['high', 'critical']
  for (const risk of body.extraction.risks) {
    const [savedRisk] = await db
      .insert(risks)
      .values({
        riskType: risk.riskType,
        projectId: risk.projectId || body.projectId,
        resourceId: risk.resourceId || null,
        category: risk.category as 'missed_deadline' | 'frequent_slippage' | 'low_attendance' | 'vague_updates' | 'blocker_unresolved' | 'estimate_mismatch' | 'vague_commitment' | 'other',
        severity: risk.severity,
        title: risk.title,
        description: risk.description,
        aiReasoning: risk.aiReasoning,
        sourceStandupId: standup.id,
        sourceRawQuote: risk.sourceRawQuote || null,
        status: 'open',
      })
      .returning()

    // Enqueue immediate alert if severity threshold met
    if (immediateSeverities.includes(risk.severity)) {
      await sendNotificationEmailQueue.add('risk-alert', {
        riskId: savedRisk.id,
        severity: risk.severity,
      })
    }

    await generateEmbeddingQueue.add('embed-risk', {
      entityType: 'risk',
      entityId: savedRisk.id,
    })
  }

  // Enqueue post-save jobs
  await generateEmbeddingQueue.add('embed-standup', {
    entityType: 'standup',
    entityId: standup.id,
  })

  await computeProjectRollupsQueue.add('after-standup', { projectId: body.projectId })

  for (const resourceId of affectedResourceIds) {
    await computeResourceRollupsQueue.add('after-standup', { resourceId })
  }

  return { id: standup.id }
})
