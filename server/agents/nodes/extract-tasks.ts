import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildExtractTasksPrompt } from '../prompts/extract-tasks.prompt'
import { ExtractedTaskItemSchema } from '../schemas'
import { invokeStructured } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function extractTasksNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { speakerSegments, standupDate, standupId } = state

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const extractedTasks = await invokeStructured(
    model,
    ExtractedTaskItemSchema,
    [
      new SystemMessage(buildExtractTasksPrompt(standupDate)),
      new HumanMessage(`Speaker segments:\n${JSON.stringify(speakerSegments, null, 2)}`),
    ],
    { nodeName: 'extract-tasks', standupId, model: modelId, provider }
  )

  return { extractedTasks }
}
