import { getDb } from '../../db/client'
import {
  projects,
  projectResources,
  resources,
  tasks,
  projectResourceTasks,
  projectClientTeamMembers,
} from '../../db/schema'
import { and, eq, isNull, desc } from 'drizzle-orm'
import { buildStandupGraph } from '../../agents/standup-graph'
import type { StandupGraphState } from '../../agents/standup-graph'
import { getLlmMeta } from '../../llm'
import { z } from 'zod'

const AnalyzeSchema = z.object({
  projectId: z.string().uuid(),
  standupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transcript: z.string().min(10),
})

const NODE_LABELS: Record<string, string> = {
  'analyze-standup': 'Analyzing standup…',
}

export default defineEventHandler(async (event) => {
  await getUserSession(event)

  const body = await readBody(event)
  const parsed = AnalyzeSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const { projectId, standupDate, transcript } = parsed.data
  const db = getDb()

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' })

  // Team members for this project
  const mappings = await db
    .select({ resource: resources })
    .from(projectResources)
    .innerJoin(resources, eq(projectResources.resourceId, resources.id))
    .where(and(eq(projectResources.projectId, projectId), isNull(projectResources.deletedAt)))

  const resourceList = mappings.map((m) => ({
    id: m.resource.id,
    name: m.resource.name,
    resourceType: m.resource.resourceType,
  }))

  // Known client members
  const clientMemberRows = await db
    .select()
    .from(projectClientTeamMembers)
    .where(eq(projectClientTeamMembers.projectId, projectId))

  const knownClientMembers = clientMemberRows.map((c) => ({
    id: c.id,
    name: c.name,
    inferredRole: c.inferredRole,
  }))

  // Last 100 tasks for this project (all statuses) for AI matching
  const recentTaskRows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      lastMentionedAt: tasks.lastMentionedAt,
      timesSlipped: tasks.timesSlipped,
    })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)))
    .orderBy(desc(tasks.updatedAt))
    .limit(100)

  // For each task, fetch assignee names
  const taskIds = recentTaskRows.map((t) => t.id)
  const assigneeRows = taskIds.length
    ? await db
        .select({
          taskId: projectResourceTasks.taskId,
          resourceName: resources.name,
        })
        .from(projectResourceTasks)
        .innerJoin(resources, eq(projectResourceTasks.resourceId, resources.id))
        .where(and(
          isNull(projectResourceTasks.deletedAt),
          // Filter to only our task IDs
          ...[]  // handled below via JS filter
        ))
    : []

  // Build assignee map
  const assigneeNamesByTask: Record<string, string[]> = {}
  for (const row of assigneeRows) {
    if (!taskIds.includes(row.taskId)) continue
    if (!assigneeNamesByTask[row.taskId]) assigneeNamesByTask[row.taskId] = []
    assigneeNamesByTask[row.taskId].push(row.resourceName)
  }

  const recentProjectTasks = recentTaskRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    assigneeNames: assigneeNamesByTask[t.id] ?? [],
    lastMentionedAt: t.lastMentionedAt,
    timesSlipped: t.timesSlipped,
  }))

  // SSE setup
  const res = event.node.res
  res.socket?.setNoDelay(true)
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  const graph = buildStandupGraph()
  const { model: modelId } = getLlmMeta()
  const startTime = Date.now()

  try {
    const stream = await graph.stream(
      {
        projectId,
        projectName: project.name,
        standupDate,
        transcript,
        resourceList,
        knownClientMembers,
        recentProjectTasks,
      },
      { streamMode: 'values' }
    )

    let finalState: StandupGraphState | null = null
    let lastCompletedCount = 0

    for await (const state of stream) {
      finalState = state as StandupGraphState

      const completed = finalState.completedNodes ?? []
      for (let i = lastCompletedCount; i < completed.length; i++) {
        const nodeName = completed[i]
        send({ type: 'progress', node: nodeName, message: NODE_LABELS[nodeName] ?? nodeName })
      }
      lastCompletedCount = completed.length
    }

    // Report node-level errors first
    if (Object.keys(finalState?.errors ?? {}).length > 0) {
      send({ type: 'error', error: JSON.stringify(finalState!.errors) })
    }

    if (!finalState?.analysis) {
      send({ type: 'error', error: 'Analysis produced no output — check server logs for the LLM error above.' })
      send({ type: 'done' })
      res.end()
      return
    }

    const { analysis } = finalState
    const processingMs = Date.now() - startTime

    // Flatten task-level risks into the top-level risks array
    const taskRisks = analysis.tasks.flatMap((t) =>
      t.risks.map((r) => ({
        riskType: 'resource' as const,
        projectId,
        resourceId: t.resourceId,
        category: r.category,
        severity: r.severity,
        title: r.title,
        description: r.description,
        aiReasoning: r.aiReasoning,
        sourceRawQuote: r.sourceRawQuote,
      }))
    )

    const standaloneRisks = analysis.risks.map((r) => ({
      riskType: r.riskType,
      projectId,
      resourceId: r.resourceId,
      category: r.category,
      severity: r.severity,
      title: r.title,
      description: r.description,
      aiReasoning: r.aiReasoning,
      sourceRawQuote: r.sourceRawQuote,
    }))

    send({
      type: 'result',
      data: {
        attendance: analysis.attendance,
        identifiedClientMembers: analysis.clientTeamMembers,
        tasks: analysis.tasks.map((t) => ({
          existingTaskId: t.existingTaskId ?? null,
          matchConfidence: t.matchConfidence ?? null,
          matchReasoning: t.matchReasoning ?? null,
          isContextUpdate: t.isContextUpdate,
          learntContext: t.learntContext ?? null,

          resourceId: t.resourceId,
          additionalAssigneeIds: t.additionalAssigneeIds,
          saidByResourceId: t.saidByResourceId ?? null,
          type: t.type,

          title: t.title,
          description: t.description,
          rawQuote: t.rawQuote,

          priority: t.priority ?? null,
          taskCategory: t.taskCategory ?? null,
          complexity: t.complexity ?? null,
          tags: t.tags,
          isClientFacing: t.isClientFacing,
          isBlocking: t.isBlocking,
          blockedByDescription: t.blockedByDescription ?? null,
          dependsOnDescription: t.dependsOnDescription ?? null,
          targetEnvironment: t.targetEnvironment,
          externalReferences: t.externalReferences,

          resourceTaskCompletionConfidence: t.resourceTaskCompletionConfidence,
          isCarriedOver: t.isCarriedOver,

          resolvedDeadlineDate: t.resolvedDeadline ?? null,
          originalDeadlinePhrase: t.deadlinePhrase ?? null,
          deadlineIsCompletion: t.deadlineIsCompletion,

          resourceEstimatedHours: t.resourceEstimatedHours ?? null,
          aiEstimatedHoursMin: t.aiEstimatedHoursMin ?? null,
          aiEstimatedHoursMax: t.aiEstimatedHoursMax ?? null,
          aiEstimateConfidence: t.aiEstimateConfidence ?? null,
          aiEstimateReasoning: t.aiEstimateReasoning ?? null,

          aiExtractionConfidence: t.aiExtractionConfidence,
          clientMemberLinks: t.clientMemberLinks,
        })),
        risks: [...taskRisks, ...standaloneRisks],
        morale: {
          personSignals: analysis.morale.personSignals.map((p) => ({
            resourceId: p.resourceId,
            resourceName: null, // enriched on save
            sentiment: p.sentiment,
            engagementLevel: p.engagementLevel,
            workloadSignal: p.workloadSignal,
            stressSignal: p.stressSignal,
            signals: p.signals,
            rawQuotes: p.rawQuotes,
          })),
          teamSummary: analysis.morale.teamSummary,
        },
        llmModelUsed: modelId,
        tokensIn: 0,
        tokensOut: 0,
        processingDurationMs: processingMs,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed'
    console.error('[analyze] graph error:', err)
    send({ type: 'error', error: message })
  }

  send({ type: 'done' })
  res.end()
})
