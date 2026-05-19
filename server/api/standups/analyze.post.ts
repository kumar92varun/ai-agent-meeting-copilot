import { getDb } from '../../db/client'
import {
  projects,
  projectResources,
  resources,
  tasks,
  projectResourceTasks,
  projectClientTeamMembers,
} from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
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

  const mappings = await db
    .select({ resource: resources })
    .from(projectResources)
    .innerJoin(resources, eq(projectResources.resourceId, resources.id))
    .where(and(eq(projectResources.projectId, projectId), isNull(projectResources.deletedAt)))

  const resourceList = mappings.map((m) => ({ id: m.resource.id, name: m.resource.name }))

  const existingTasksByResource: Record<string, Array<{ id: string; title: string; description: string | null; status: string }>> = {}
  for (const { resource } of mappings) {
    const openTasks = await db
      .select({ id: tasks.id, title: tasks.title, description: tasks.description, status: tasks.status })
      .from(tasks)
      .innerJoin(
        projectResourceTasks,
        and(eq(projectResourceTasks.taskId, tasks.id), eq(projectResourceTasks.resourceId, resource.id))
      )
      .where(and(isNull(tasks.deletedAt), isNull(projectResourceTasks.deletedAt)))

    existingTasksByResource[resource.id] = openTasks
  }

  const clientMemberRows = await db
    .select()
    .from(projectClientTeamMembers)
    .where(eq(projectClientTeamMembers.projectId, projectId))

  const knownClientMembers = clientMemberRows.map((c) => ({
    id: c.id,
    name: c.name,
    inferredRole: c.inferredRole,
  }))

  // SSE setup — disable Nagle so each write flushes immediately
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
        existingTasksByResource,
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

    if (!finalState?.analysis) {
      send({ type: 'error', error: 'Graph produced no output' })
      send({ type: 'done' })
      res.end()
      return
    }

    if (Object.keys(finalState.errors ?? {}).length > 0) {
      send({ type: 'error', error: JSON.stringify(finalState.errors) })
    }

    const { analysis } = finalState
    const processingMs = Date.now() - startTime

    // Flatten task-level risks into the top-level risks array expected by the save endpoint.
    // Task risks become resource-scoped risks; standalone risks pass through as-is.
    const taskRisks = analysis.tasks.flatMap((t) =>
      t.risks.map((r) => ({
        riskType: 'resource' as const,
        projectId: projectId,
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
      projectId: projectId,
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
          title: t.title,
          description: t.description,
          resourceId: t.resourceId,
          resolvedDeadlineDate: t.resolvedDeadline ?? null,
          originalDeadlinePhrase: t.deadlinePhrase ?? null,
          resourceEstimatedHours: t.resourceEstimatedHours ?? null,
          aiEstimatedHoursMin: t.aiEstimatedHoursMin ?? null,
          aiEstimatedHoursMax: t.aiEstimatedHoursMax ?? null,
          aiEstimateConfidence: t.aiEstimateConfidence ?? null,
          aiEstimateReasoning: t.aiEstimateReasoning ?? null,
          commitmentConfidence: t.commitmentConfidence,
          isCompleted: t.type === 'completed',
          isCarriedOver: t.isCarriedOver,
          rawQuote: t.rawQuote,
          clientMemberLinks: t.clientMemberLinks,
        })),
        risks: [...taskRisks, ...standaloneRisks],
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
