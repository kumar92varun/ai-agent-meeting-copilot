import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildMatchExistingTasksPrompt } from '../prompts/match-existing-tasks.prompt'
import { MatchResultItemSchema } from '../schemas'
import { invokeWithLogging } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function matchExistingTasksNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { extractedTasks, existingTasksByResource, standupId } = state

  if (!extractedTasks.length) return { matchResults: [] }

  const systemPrompt = buildMatchExistingTasksPrompt()
  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const context = JSON.stringify({ extractedTasks, existingTasksByResource }, null, 2)

  const response = await invokeWithLogging<{ content: string }>(
    model,
    [
      new SystemMessage(systemPrompt),
      new HumanMessage(context),
    ],
    { nodeName: 'match-existing-tasks', standupId, model: modelId, provider }
  )

  const rawJson = (response as unknown as { content: string }).content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(rawJson)
  const matchResults = MatchResultItemSchema.array().parse(parsed)

  return { matchResults }
}
