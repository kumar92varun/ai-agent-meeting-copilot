import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { sql } from 'drizzle-orm'
import { getChatModel, getEmbeddingModel, getLlmMeta } from '../../llm'
import { buildMatchExistingTasksPrompt } from '../prompts/match-existing-tasks.prompt'
import { MatchResultItemSchema } from '../schemas'
import { invokeStructured } from '../../llm/logging'
import { getDb } from '../../db/client'
import type { StandupGraphState } from '../standup-graph'
import { logger } from '../../utils/logger'

const SIMILARITY_THRESHOLD = 0.72
const TOP_K = 5

export async function matchExistingTasksNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { extractedTasks, existingTasksByResource, projectId, standupId } = state

  if (!extractedTasks.length) return { matchResults: [] }

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  // Build a flat map of all existing tasks across resources for fast ID lookup
  const allExistingTasks: Record<string, { id: string; title: string; description: string | null; status: string }> = {}
  for (const tasks of Object.values(existingTasksByResource)) {
    for (const t of tasks) allExistingTasks[t.id] = t

  }

  // Narrow candidate sets via pgvector semantic search, then fall back to all
  // tasks for a resource when no embedding candidates are found (e.g. first standup)
  const candidatesByIndex: Record<number, Array<{ id: string; title: string; description: string | null; status: string }>> = {}

  if (Object.keys(allExistingTasks).length > 0) {
    const db = getDb()
    const embeddingModel = getEmbeddingModel()

    for (let i = 0; i < extractedTasks.length; i++) {
      const task = extractedTasks[i]
      const queryText = `${task.title} ${task.description ?? ''}`.trim()

      try {
        const queryVector = await embeddingModel.embedQuery(queryText)
        const vectorLiteral = `[${queryVector.join(',')}]`

        const rows = await db.execute<{ entity_id: string; similarity: number }>(sql`
          SELECT entity_id, 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
          FROM vector_store
          WHERE entity_type = 'task'
            AND project_id = ${projectId}
            AND 1 - (embedding <=> ${vectorLiteral}::vector) > ${SIMILARITY_THRESHOLD}
          ORDER BY embedding <=> ${vectorLiteral}::vector
          LIMIT ${TOP_K}
        `)

        const candidates = rows
          .map((r) => allExistingTasks[r.entity_id])
          .filter(Boolean)

        // Fall back to all tasks for this resource when no embedding candidates found
        candidatesByIndex[i] = candidates.length > 0
          ? candidates
          : (existingTasksByResource[task.resourceId] ?? [])
      } catch (err) {
        logger.warn({ err, taskIndex: i }, 'Vector search failed for task — falling back to full list')
        candidatesByIndex[i] = existingTasksByResource[task.resourceId] ?? []
      }
    }
  } else {
    // No existing tasks at all — everything is new
    for (let i = 0; i < extractedTasks.length; i++) {
      candidatesByIndex[i] = []
    }
  }

  const matchResults = await invokeStructured(
    model,
    MatchResultItemSchema,
    [
      new SystemMessage(buildMatchExistingTasksPrompt()),
      new HumanMessage(JSON.stringify({ extractedTasks, candidatesByIndex }, null, 2)),
    ],
    { nodeName: 'match-existing-tasks', standupId, model: modelId, provider }
  )

  return { matchResults }
}
