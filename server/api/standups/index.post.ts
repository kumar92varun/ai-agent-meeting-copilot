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
  taskHistory,
  resources,
  standupMoraleSignals,
} from '../../db/schema'
import { and, eq, isNull, ne, desc, inArray } from 'drizzle-orm'
import {
  computeProjectRollupsQueue,
  computeResourceRollupsQueue,
  generateEmbeddingQueue,
  sendNotificationEmailQueue,
} from '../../jobs/queues'
import type { SaveStandupRequest } from '../../../shared/types/api'
import { fromISTDate, toISTDate } from '../../utils/dates'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string; name?: string }

  const db = getDb()

  // Clean up LLM output before saving:
  // - it sometimes emits the string "null" (e.g. resolvedDeadlineDate), which Postgres rejects;
  // - it sometimes returns a person's uuid with one character wrong, which breaks foreign keys,
  //   so only ids of real resources are kept.
  const validResourceIds = new Set(
    (await db.select({ id: resources.id }).from(resources).where(isNull(resources.deletedAt))).map((r) => r.id)
  )
  const body = dropUnknownResourceIds(
    nullifyStringNulls(await readBody(event)),
    validResourceIds
  ) as SaveStandupRequest

  // ── 1. Insert standup record ────────────────────────────────────
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

  // ── 2. Upsert client team members ──────────────────────────────
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

  // ── 3. Persist attendance ──────────────────────────────────────
  for (const att of body.extraction.attendance) {
    // Skip people the LLM didn't match to a project resource (it returns a bare name instead of an id)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(att.resourceId ?? '')) continue
    await db.insert(standupUpdates).values({
      standupId: standup.id,
      resourceId: att.resourceId,
      attended: att.attended,
    })
    affectedResourceIds.add(att.resourceId)
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // ── 4. Persist tasks ───────────────────────────────────────────
  for (const extracted of body.extraction.tasks) {
    const rawExistingId = extracted.existingTaskId
    const isExistingTask = !!(rawExistingId && UUID_RE.test(rawExistingId))
    const taskId = isExistingTask ? rawExistingId! : null

    const newStatus = extracted.type === 'completed'
      ? 'completed'
      : extracted.isCarriedOver
        ? 'carried_over'
        : 'committed'

    if (isExistingTask && taskId) {
      // ── Existing task: update fields + write history ─────────────
      const [existing] = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
        .limit(1)

      if (existing) {
        const prevDeadline = existing.resolvedDeadlineDate
        const newDeadline = extracted.resolvedDeadlineDate || null
        const deadlineExtended =
          prevDeadline &&
          newDeadline &&
          newDeadline > prevDeadline &&
          newStatus !== 'completed'

        await db
          .update(tasks)
          .set({
            title: extracted.title,
            description: extracted.description || existing.description,
            status: newStatus,
            taskUpdateType: extracted.type,
            priority: (extracted.priority as any) || existing.priority,
            taskCategory: (extracted.taskCategory as any) || existing.taskCategory,
            complexity: (extracted.complexity as any) || existing.complexity,
            tags: extracted.tags.length ? extracted.tags : existing.tags,
            isClientFacing: extracted.isClientFacing,
            isBlocking: extracted.isBlocking,
            blockedByDescription: extracted.blockedByDescription || existing.blockedByDescription,
            dependsOnDescription: extracted.dependsOnDescription || existing.dependsOnDescription,
            targetEnvironment: (extracted.targetEnvironment as any) || existing.targetEnvironment,
            externalReferences: extracted.externalReferences.length
              ? extracted.externalReferences
              : existing.externalReferences,
            rawQuote: extracted.rawQuote || existing.rawQuote,
            saidByResourceId: extracted.saidByResourceId && UUID_RE.test(extracted.saidByResourceId)
              ? extracted.saidByResourceId
              : existing.saidByResourceId,
            resourceTaskCompletionConfidence: (extracted.resourceTaskCompletionConfidence as any) || existing.resourceTaskCompletionConfidence,
            isCarriedOver: extracted.isCarriedOver,
            originalDeadlinePhrase: extracted.originalDeadlinePhrase || existing.originalDeadlinePhrase,
            resolvedDeadlineDate: newDeadline || existing.resolvedDeadlineDate,
            deadlineIsCompletion: extracted.deadlineIsCompletion,
            resourceEstimatedHours: extracted.resourceEstimatedHours ?? existing.resourceEstimatedHours,
            aiEstimatedHoursMin: extracted.aiEstimatedHoursMin ?? existing.aiEstimatedHoursMin,
            aiEstimatedHoursMax: extracted.aiEstimatedHoursMax ?? existing.aiEstimatedHoursMax,
            aiEstimateConfidence: (extracted.aiEstimateConfidence as any) ?? existing.aiEstimateConfidence,
            aiEstimateReasoning: extracted.aiEstimateReasoning || existing.aiEstimateReasoning,
            timesSlipped: deadlineExtended ? (existing.timesSlipped + 1) : existing.timesSlipped,
            totalDaysSlipped: deadlineExtended && prevDeadline && newDeadline
              ? existing.totalDaysSlipped + Math.ceil(
                  (fromISTDate(newDeadline).getTime() - fromISTDate(prevDeadline).getTime()) / 86400000
                )
              : existing.totalDaysSlipped,
            aiMatchConfidence: (extracted.matchConfidence as any) || existing.aiMatchConfidence,
            aiMatchReasoning: extracted.matchReasoning || existing.aiMatchReasoning,
            aiExtractionConfidence: (extracted.aiExtractionConfidence as any) || existing.aiExtractionConfidence,
            lastMentionedStandupId: standup.id,
            lastMentionedAt: body.standupDate,
            standupMentionCount: (existing.standupMentionCount ?? 1) + 1,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskId))

        // Write history entry
        if (deadlineExtended) {
          await db.insert(taskHistory).values({
            taskId,
            standupId: standup.id,
            actorLabel: 'AI',
            changeType: 'deadline_extended',
            fieldName: 'resolved_deadline_date',
            oldValue: prevDeadline,
            newValue: newDeadline,
            note: `Deadline extended from ${prevDeadline} to ${newDeadline}`,
          })
        }

        if (newStatus === 'completed' && existing.status !== 'completed') {
          await db.insert(taskHistory).values({
            taskId,
            standupId: standup.id,
            actorLabel: 'AI',
            changeType: 'status_changed',
            fieldName: 'status',
            oldValue: existing.status,
            newValue: 'completed',
            note: `Task marked as completed in standup on ${body.standupDate}`,
          })
        }

        if (extracted.isContextUpdate && extracted.learntContext) {
          await db.insert(taskHistory).values({
            taskId,
            standupId: standup.id,
            actorLabel: 'AI',
            changeType: 'ai_updated',
            learntContext: extracted.learntContext,
            note: `New context learnt on ${body.standupDate}: ${extracted.learntContext.slice(0, 120)}`,
          })
        }

        if (!deadlineExtended && newStatus !== 'completed' && !extracted.isContextUpdate) {
          await db.insert(taskHistory).values({
            taskId,
            standupId: standup.id,
            actorLabel: 'AI',
            changeType: 'standup_mentioned',
            note: `Task mentioned in standup on ${body.standupDate}`,
          })
        }
      }
    } else {
      // ── New task: insert + first history entry ───────────────────
      const [newTask] = await db
        .insert(tasks)
        .values({
          projectId: body.projectId,
          title: extracted.title,
          description: extracted.description || null,
          status: newStatus as any,
          taskUpdateType: extracted.type as any,
          priority: (extracted.priority as any) || null,
          taskCategory: (extracted.taskCategory as any) || null,
          complexity: (extracted.complexity as any) || null,
          tags: extracted.tags,
          isClientFacing: extracted.isClientFacing,
          isBlocking: extracted.isBlocking,
          blockedByDescription: extracted.blockedByDescription || null,
          dependsOnDescription: extracted.dependsOnDescription || null,
          targetEnvironment: (extracted.targetEnvironment as any) || 'not_specified',
          externalReferences: extracted.externalReferences,
          rawQuote: extracted.rawQuote || null,
          saidByResourceId: extracted.saidByResourceId && UUID_RE.test(extracted.saidByResourceId)
            ? extracted.saidByResourceId
            : null,
          resourceTaskCompletionConfidence: (extracted.resourceTaskCompletionConfidence as any) || null,
          isCarriedOver: extracted.isCarriedOver,
          originalDeadlinePhrase: extracted.originalDeadlinePhrase || null,
          resolvedDeadlineDate: extracted.resolvedDeadlineDate || null,
          deadlineIsCompletion: extracted.deadlineIsCompletion,
          resourceEstimatedHours: extracted.resourceEstimatedHours || null,
          aiEstimatedHoursMin: extracted.aiEstimatedHoursMin || null,
          aiEstimatedHoursMax: extracted.aiEstimatedHoursMax || null,
          aiEstimateConfidence: (extracted.aiEstimateConfidence as any) || null,
          aiEstimateReasoning: extracted.aiEstimateReasoning || null,
          aiMatchConfidence: (extracted.matchConfidence as any) || null,
          aiMatchReasoning: extracted.matchReasoning || null,
          aiExtractionConfidence: (extracted.aiExtractionConfidence as any) || null,
          firstMentionedStandupId: standup.id,
          lastMentionedStandupId: standup.id,
          lastMentionedAt: body.standupDate,
          standupMentionCount: 1,
        })
        .returning()

      // First history entry — AI created
      await db.insert(taskHistory).values({
        taskId: newTask.id,
        standupId: standup.id,
        actorLabel: 'AI',
        changeType: 'ai_created',
        note: `Task extracted by AI from standup on ${body.standupDate}`,
        newValue: { title: newTask.title, description: newTask.description },
      })

      // Add primary assignee
      if (extracted.resourceId && UUID_RE.test(extracted.resourceId)) {
        await db
          .insert(projectResourceTasks)
          .values({
            taskId: newTask.id,
            resourceId: extracted.resourceId,
            projectId: body.projectId,
            addedByStandupId: standup.id,
            completedAt: extracted.type === 'completed' ? new Date() : null,
          })
          .onConflictDoNothing()

        await db.insert(taskHistory).values({
          taskId: newTask.id,
          standupId: standup.id,
          actorLabel: 'AI',
          changeType: 'assignee_added',
          note: `Primary assignee set from standup extraction`,
          newValue: { resourceId: extracted.resourceId },
        })

        affectedResourceIds.add(extracted.resourceId)
      }

      // Add secondary assignees
      for (const additionalId of extracted.additionalAssigneeIds ?? []) {
        if (!UUID_RE.test(additionalId)) continue
        await db
          .insert(projectResourceTasks)
          .values({
            taskId: newTask.id,
            resourceId: additionalId,
            projectId: body.projectId,
            addedByStandupId: standup.id,
          })
          .onConflictDoNothing()

        await db.insert(taskHistory).values({
          taskId: newTask.id,
          standupId: standup.id,
          actorLabel: 'AI',
          changeType: 'assignee_added',
          note: `Additional assignee added from standup extraction`,
          newValue: { resourceId: additionalId },
        })

        affectedResourceIds.add(additionalId)
      }

      // Client member links
      for (const link of extracted.clientMemberLinks ?? []) {
        const clientMemberId = clientMemberIdByName[link.clientMemberName.toLowerCase()]
        if (!clientMemberId) continue
        await db
          .insert(projectTaskClientAssignments)
          .values({
            taskId: newTask.id,
            clientMemberId,
            assignmentType: link.assignmentType,
            sourceStandupId: standup.id,
          })
          .onConflictDoNothing()
      }

      // Embedding
      await generateEmbeddingQueue.add('embed-task', {
        entityType: 'task',
        entityId: newTask.id,
        projectId: body.projectId,
        resourceId: extracted.resourceId,
      })

      // Also add existing task's resourceId to affected set for rollups
      if (extracted.resourceId && UUID_RE.test(extracted.resourceId)) {
        affectedResourceIds.add(extracted.resourceId)
      }
    }
  }

  // ── 5. Persist risks ───────────────────────────────────────────
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
        category: risk.category as any,
        severity: risk.severity,
        title: risk.title,
        description: risk.description,
        aiReasoning: risk.aiReasoning,
        sourceStandupId: standup.id,
        sourceRawQuote: risk.sourceRawQuote || null,
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

  // ── 6. Persist morale signals + auto-risks ────────────────────
  const moraleData = body.extraction.morale
  if (moraleData) {
    // Build resource name map for denormalisation
    const resourceNameMap: Record<string, string> = {}
    for (const { resource } of await db
      .select({ resource: resources })
      .from(resources)
      .where(inArray(resources.id,
        moraleData.personSignals
          .map((p) => p.resourceId)
          .filter((id) => UUID_RE.test(id))
      ))) {
      resourceNameMap[resource.id] = resource.name
    }

    // Insert per-person rows
    for (const person of moraleData.personSignals) {
      if (!UUID_RE.test(person.resourceId)) continue
      await db.insert(standupMoraleSignals).values({
        standupId: standup.id,
        projectId: body.projectId,
        resourceId: person.resourceId,
        resourceName: resourceNameMap[person.resourceId] ?? null,
        sentiment: person.sentiment,
        engagementLevel: person.engagementLevel,
        workloadSignal: person.workloadSignal,
        stressSignal: person.stressSignal,
        signals: person.signals,
        rawQuotes: person.rawQuotes,
      })

      // Auto-risk: check last 3 standups for sustained negative patterns
      const MORALE_RISK_THRESHOLD = 3
      const recentPersonSignals = await db
        .select({
          stressSignal: standupMoraleSignals.stressSignal,
          sentiment: standupMoraleSignals.sentiment,
          engagementLevel: standupMoraleSignals.engagementLevel,
        })
        .from(standupMoraleSignals)
        .where(and(
          eq(standupMoraleSignals.projectId, body.projectId),
          eq(standupMoraleSignals.resourceId, person.resourceId),
        ))
        .orderBy(desc(standupMoraleSignals.createdAt))
        .limit(MORALE_RISK_THRESHOLD)

      // Include today's signal in the check
      const allSignals = [
        { stressSignal: person.stressSignal, sentiment: person.sentiment, engagementLevel: person.engagementLevel },
        ...recentPersonSignals,
      ].slice(0, MORALE_RISK_THRESHOLD)

      if (allSignals.length >= MORALE_RISK_THRESHOLD) {
        const sustainedHighStress = allSignals.every((s) => s.stressSignal === 'high' || s.stressSignal === 'moderate')
        const sustainedNegative = allSignals.every((s) => s.sentiment === 'negative')
        const sustainedLowEngagement = allSignals.every((s) => s.engagementLevel === 'low')

        if (sustainedHighStress || sustainedNegative || sustainedLowEngagement) {
          // Only raise if no open morale risk already exists for this resource
          const [existingMoraleRisk] = await db
            .select({ id: risks.id })
            .from(risks)
            .where(and(
              eq(risks.resourceId, person.resourceId),
              eq(risks.category, 'sustained_low_morale'),
              eq(risks.status, 'open'),
              isNull(risks.deletedAt),
            ))
            .limit(1)

          if (!existingMoraleRisk) {
            const reason = sustainedHighStress
              ? 'sustained high stress signals'
              : sustainedNegative
                ? 'sustained negative sentiment'
                : 'sustained low engagement'
            const [savedMoraleRisk] = await db.insert(risks).values({
              riskType: 'resource',
              projectId: body.projectId,
              resourceId: person.resourceId,
              category: 'sustained_low_morale',
              severity: sustainedHighStress ? 'high' : 'medium',
              title: `Sustained low morale — ${resourceNameMap[person.resourceId] ?? person.resourceId}`,
              description: `${resourceNameMap[person.resourceId] ?? 'A team member'} has shown ${reason} across the last ${MORALE_RISK_THRESHOLD} standups.`,
              aiReasoning: `Pattern detected: ${reason} for ${MORALE_RISK_THRESHOLD} consecutive standups. Recommend a 1:1 check-in.`,
              sourceStandupId: standup.id,
              status: 'open',
            }).returning()

            if (savedMoraleRisk.severity === 'high') {
              await sendNotificationEmailQueue.add('risk-alert', {
                riskId: savedMoraleRisk.id,
                severity: savedMoraleRisk.severity,
              })
            }
          }
        }
      }
    }

    // Insert team-summary row (resource_id null)
    const ts = moraleData.teamSummary
    await db.insert(standupMoraleSignals).values({
      standupId: standup.id,
      projectId: body.projectId,
      resourceId: null,
      overallTeamSentiment: ts.overallTeamSentiment,
      teamEnergy: ts.teamEnergy,
      collaborationSignal: ts.collaborationSignal,
      tensionSignal: ts.tensionSignal,
      aiObservation: ts.aiObservation,
    })

    // Auto-risk: team tension
    if (ts.tensionSignal === 'notable') {
      const [existingTensionRisk] = await db
        .select({ id: risks.id })
        .from(risks)
        .where(and(
          eq(risks.projectId, body.projectId),
          eq(risks.category, 'team_tension'),
          eq(risks.status, 'open'),
          isNull(risks.deletedAt),
        ))
        .limit(1)

      if (!existingTensionRisk) {
        await db.insert(risks).values({
          riskType: 'project',
          projectId: body.projectId,
          resourceId: null,
          category: 'team_tension',
          severity: 'medium',
          title: 'Team tension detected in standup',
          description: `Notable tension or conflict signals were observed in the standup on ${body.standupDate}.`,
          aiReasoning: ts.aiObservation,
          sourceStandupId: standup.id,
          status: 'open',
        })
      }
    }
  }

  // ── 7. Post-save jobs ──────────────────────────────────────────
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

function nullifyStringNulls(value: unknown): unknown {
  if (typeof value === 'string') return /^(null|undefined)$/i.test(value.trim()) ? null : value
  if (Array.isArray(value)) return value.map(nullifyStringNulls)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, nullifyStringNulls(v)]))
  }
  return value
}

function dropUnknownResourceIds(value: unknown, valid: Set<string>): unknown {
  if (Array.isArray(value)) return value.map((v) => dropUnknownResourceIds(v, valid))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => {
        if (k === 'resourceId' || k === 'saidByResourceId') {
          return [k, typeof v === 'string' && valid.has(v) ? v : null]
        }
        if (k === 'additionalAssigneeIds' && Array.isArray(v)) {
          return [k, v.filter((id) => typeof id === 'string' && valid.has(id))]
        }
        return [k, dropUnknownResourceIds(v, valid)]
      })
    )
  }
  return value
}
