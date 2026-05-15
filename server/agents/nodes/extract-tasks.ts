import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildExtractTasksPrompt } from '../prompts/extract-tasks.prompt'
import { ExtractedTaskItemSchema } from '../schemas'
import { invokeWithLogging } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function extractTasksNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { speakerSegments, standupDate, standupId } = state

  const systemPrompt = buildExtractTasksPrompt(standupDate)
  const segmentsContext = JSON.stringify(speakerSegments, null, 2)

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const response = await invokeWithLogging<{ content: string }>(
    model,
    [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Speaker segments:\n${segmentsContext}`),
    ],
    { nodeName: 'extract-tasks', standupId, model: modelId, provider }
  )

  const rawJson = (response as unknown as { content: string }).content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(rawJson)
  const extractedTasks = ExtractedTaskItemSchema.array().parse(parsed)

  return { extractedTasks }
}
