import { getDb } from '../../db/client'
import {
  standups,
  standupUpdates,
  tasks,
  projectResourceTasks,
  risks,
  notificationSettings,
  projectClientTeamMembers,
  projectTaskClientAssignments,
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

  // Upsert client team members discovered in this standup
  const clientMemberIdByName: Record<string, string> = {}

  for (const member of body.extraction.identifiedClientMembers) {
    const [upserted] = await db
      .insert(projectClientTeamMembers)
      .values({
        projectId: body.projectId,
        name: member.name,
        inferredRole: member.inferredRole ?? null,
        firstMentionedStandupId: standup.id,
      })
      .onConflictDoUpdate({
        target: [projectClientTeamMembers.projectId, projectClientTeamMembers.name],
        set: { updatedAt: new Date() },
      })
      .returning()

    clientMemberIdByName[member.name.toLowerCase()] = upserted.id
  }

  // Persist attendance
  for (const att of body.extraction.attendance) {
    await db.insert(standupUpdates).values({
      standupId: standup.id,
      resourceId: att.resourceId,
      attended: att.attended,
    })
    affectedResourceIds.add(att.resourceId)
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Persist tasks
  for (const extracted of body.extraction.tasks) {
    // LLM sometimes returns ":null", "null", or other non-UUID strings — treat all as no match
    const rawId = extracted.existingTaskId
    let taskId: string | null = rawId && UUID_RE.test(rawId) ? rawId : null

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

    // Save client member links for this task
    for (const link of extracted.clientMemberLinks ?? []) {
      const clientMemberId = clientMemberIdByName[link.clientMemberName.toLowerCase()]
      if (!clientMemberId) continue

      await db
        .insert(projectTaskClientAssignments)
        .values({
          taskId,
          clientMemberId,
          assignmentType: link.assignmentType,
          sourceStandupId: standup.id,
        })
        .onConflictDoNothing()
    }

    // Enqueue task embedding — one per (task, resource) pair
    await generateEmbeddingQueue.add('embed-task', {
      entityType: 'task',
      entityId: taskId,
      projectId: body.projectId,
      resourceId: extracted.resourceId,
    })

    affectedResourceIds.add(extracted.resourceId)
  }

  // Persist risks — insert no-risk sentinel if nothing was detected
  const risksToSave = body.extraction.risks.length > 0
    ? body.extraction.risks
    : [{
        riskType: 'project' as const,
        projectId: body.projectId,
        resourceId: null,
        category: 'other' as const,
        severity: 'low' as const,
        title: 'No risks detected',
        description: 'The AI found no risks in this standup.',
        aiReasoning: 'No anomalies, blockers, missed deadlines, or patterns of concern were identified.',
        sourceRawQuote: null,
        isNoRiskSentinel: true,
      }]

  const immediateSeverities = ['high', 'critical']
  for (const risk of risksToSave) {
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
        // Sentinel records are pre-acknowledged so they don't pollute open risk counts
        status: 'isNoRiskSentinel' in risk && risk.isNoRiskSentinel ? 'acknowledged' : 'open',
      })
      .returning()

    if (immediateSeverities.includes(risk.severity) && !('isNoRiskSentinel' in risk && risk.isNoRiskSentinel)) {
      await sendNotificationEmailQueue.add('risk-alert', {
        riskId: savedRisk.id,
        severity: risk.severity,
      })
    }

    await generateEmbeddingQueue.add('embed-risk', {
      entityType: 'risk',
      entityId: savedRisk.id,
      projectId: risk.projectId || body.projectId,
      resourceId: risk.resourceId || null,
    })
  }

  // Enqueue post-save jobs
  await generateEmbeddingQueue.add('embed-standup', {
    entityType: 'standup',
    entityId: standup.id,
    projectId: body.projectId,
  })

  await computeProjectRollupsQueue.add('after-standup', { projectId: body.projectId })

  for (const resourceId of affectedResourceIds) {
    await computeResourceRollupsQueue.add('after-standup', { resourceId })
  }

  return { id: standup.id }
})
