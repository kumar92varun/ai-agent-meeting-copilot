import { getDb } from '../db/client'
import { embeddings, standups, tasks, risks } from '../db/schema'
import { eq } from 'drizzle-orm'
import { getEmbeddingModel, getLlmMeta } from '../llm'
import { logger } from '../utils/logger'

export interface GenerateEmbeddingPayload {
  entityType: 'standup' | 'task' | 'risk'
  entityId: string
}

export async function generateEmbedding(payload: GenerateEmbeddingPayload) {
  const db = getDb()
  const embeddingModel = getEmbeddingModel()
  const { model: modelId } = getLlmMeta()

  let content: string

  if (payload.entityType === 'standup') {
    const [standup] = await db.select().from(standups).where(eq(standups.id, payload.entityId)).limit(1)
    if (!standup) throw new Error(`Standup ${payload.entityId} not found`)
    content = standup.rawTranscript.slice(0, 8000) // trim for embedding limits
  } else if (payload.entityType === 'task') {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, payload.entityId)).limit(1)
    if (!task) throw new Error(`Task ${payload.entityId} not found`)
    content = `${task.title}\n${task.description || ''}`
  } else {
    const [risk] = await db.select().from(risks).where(eq(risks.id, payload.entityId)).limit(1)
    if (!risk) throw new Error(`Risk ${payload.entityId} not found`)
    content = `${risk.title}\n${risk.description}\n${risk.aiReasoning}`
  }

  const vector = await embeddingModel.embedQuery(content)

  await db.insert(embeddings).values({
    entityType: payload.entityType,
    entityId: payload.entityId,
    content,
    embedding: vector,
    modelUsed: modelId,
  })

  logger.info({ entityType: payload.entityType, entityId: payload.entityId }, 'Embedding generated')
}
