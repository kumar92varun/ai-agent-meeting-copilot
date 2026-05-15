import { getDb } from '../../db/client'
import { projects, projectResources, resources, tasks, projectResourceTasks } from '../../db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { buildStandupGraph } from '../../agents/standup-graph'
import type { ExtractedTaskItem, MatchResultItem, DeadlineResolution, HourEstimate } from '../../agents/schemas'
import { getLlmMeta } from '../../llm'
import { z } from 'zod'

const AnalyzeSchema = z.object({
  projectId: z.string().uuid(),
  standupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transcript: z.string().min(10),
})

export default defineEventHandler(async (event) => {
  await getUserSession(event) // auth check

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

  // Load project resource list for fuzzy name matching in agent
  const mappings = await db
    .select({ resource: resources })
    .from(projectResources)
    .innerJoin(resources, eq(projectResources.resourceId, resources.id))
    .where(and(eq(projectResources.projectId, projectId), isNull(projectResources.deletedAt)))

  const resourceList = mappings.map((m) => ({ id: m.resource.id, name: m.resource.name }))

  // Load existing open tasks per resource for match-existing-tasks node
  const existingTasksByResource: Record<string, Array<{ id: string; title: string; description: string | null; status: string }>> = {}
  for (const { resource } of mappings) {
    const openTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
      })
      .from(tasks)
      .innerJoin(projectResourceTasks, and(eq(projectResourceTasks.taskId, tasks.id), eq(projectResourceTasks.resourceId, resource.id)))
      .where(and(isNull(tasks.deletedAt), isNull(projectResourceTasks.deletedAt)))

    existingTasksByResource[resource.id] = openTasks
  }

  // Set up SSE
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const send = (data: object) => {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  const graph = buildStandupGraph()
  const { model: modelId } = getLlmMeta()
  const startTime = Date.now()

  try {
    const NODE_LABELS: Record<string, string> = {
      'parse-transcript': 'Parsing transcript…',
      'infer-attendance': 'Inferring attendance…',
      'extract-tasks': 'Extracting tasks…',
      'match-existing-tasks': 'Matching existing tasks…',
      'resolve-deadlines': 'Resolving deadlines…',
      'estimate-hours': 'Estimating hours…',
      'detect-risks': 'Detecting risks…',
    }

    let lastCompletedCount = 0
    const finalState = await graph.invoke({
      projectId,
      projectName: project.name,
      standupDate,
      transcript,
      resourceList,
      existingTasksByResource,
    })

    // Emit progress events for each completed node
    for (const nodeName of finalState.completedNodes) {
      send({ type: 'progress', node: nodeName, message: NODE_LABELS[nodeName] || nodeName })
    }

    if (Object.keys(finalState.errors || {}).length > 0) {
      send({ type: 'error', error: JSON.stringify(finalState.errors) })
    }

    const processingMs = Date.now() - startTime

    send({
      type: 'result',
      data: {
        attendance: finalState.attendance,
        tasks: finalState.extractedTasks.map((t: ExtractedTaskItem, i: number) => {
          const matchResult = finalState.matchResults.find((m: MatchResultItem) => m.extractedIndex === i)
          const deadlineRes = finalState.deadlineResolutions.find(
            (d: DeadlineResolution) => d.originalPhrase === t.deadlinePhrase
          )
          const hourEst = finalState.hourEstimates.find((h: HourEstimate) => h.taskIndex === i)

          return {
            existingTaskId: matchResult?.existingTaskId ?? null,
            title: t.title,
            description: t.description,
            resourceId: t.resourceId,
            resolvedDeadlineDate: deadlineRes?.resolvedDate ?? null,
            originalDeadlinePhrase: t.deadlinePhrase,
            resourceEstimatedHours: t.estimatedHours,
            aiEstimatedHoursMin: hourEst?.aiEstimatedHoursMin ?? null,
            aiEstimatedHoursMax: hourEst?.aiEstimatedHoursMax ?? null,
            aiEstimateConfidence: hourEst?.aiEstimateConfidence ?? null,
            aiEstimateReasoning: hourEst?.aiEstimateReasoning ?? null,
            commitmentConfidence: t.commitmentConfidence,
            isCompleted: t.type === 'completed',
            isCarriedOver: t.isCarriedOver,
            rawQuote: t.rawQuote,
          }
        }),
        risks: finalState.detectedRisks,
        llmModelUsed: modelId,
        tokensIn: 0,
        tokensOut: 0,
        processingDurationMs: processingMs,
      },
    })
  } catch (err) {
    send({ type: 'error', error: err instanceof Error ? err.message : 'Analysis failed' })
  }

  send({ type: 'done' })
  event.node.res.end()
})
