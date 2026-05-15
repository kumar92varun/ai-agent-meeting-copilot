import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildMatchExistingTasksPrompt } from '../prompts/match-existing-tasks.prompt'
import { MatchResultItemSchema } from '../schemas'
import { invokeStructured } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function matchExistingTasksNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { extractedTasks, existingTasksByResource, standupId } = state

  if (!extractedTasks.length) return { matchResults: [] }

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const matchResults = await invokeStructured(
    model,
    MatchResultItemSchema,
    [
      new SystemMessage(buildMatchExistingTasksPrompt()),
      new HumanMessage(JSON.stringify({ extractedTasks, existingTasksByResource }, null, 2)),
    ],
    { nodeName: 'match-existing-tasks', standupId, model: modelId, provider }
  )

  return { matchResults }
}
