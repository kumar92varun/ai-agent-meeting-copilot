import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildExtractTasksPrompt } from '../prompts/extract-tasks.prompt'
import { ExtractedTaskItemSchema } from '../schemas'
import { invokeStructured } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function extractTasksNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const {
    speakerSegments,
    identifiedClientMembers,
    knownClientMembers,
    fathomActionItems,
    standupDate,
    standupId,
  } = state

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  // Merge known + newly identified client members for the prompt
  const allClientMembers = [
    ...knownClientMembers.map((c) => ({ name: c.name, inferredRole: c.inferredRole })),
    ...identifiedClientMembers,
  ]

  const userMessage = [
    `Speaker segments:\n${JSON.stringify(speakerSegments, null, 2)}`,
    fathomActionItems.length
      ? `\nFathom-extracted ACTION ITEMs (use as supplementary context, do not duplicate as separate tasks):\n${fathomActionItems.map((a) => `- ${a}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const extractedTasks = await invokeStructured(
    model,
    ExtractedTaskItemSchema,
    [
      new SystemMessage(buildExtractTasksPrompt(standupDate, allClientMembers)),
      new HumanMessage(userMessage),
    ],
    { nodeName: 'extract-tasks', standupId, model: modelId, provider }
  )

  return { extractedTasks }
}
