import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildDetectRisksPrompt } from '../prompts/detect-risks.prompt'
import { ExtractedRiskSchema } from '../schemas'
import { invokeWithLogging } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function detectRisksNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const {
    extractedTasks,
    attendance,
    matchResults,
    deadlineResolutions,
    hourEstimates,
    existingTasksByResource,
    projectId,
    projectName,
    standupDate,
    standupId,
  } = state

  const systemPrompt = buildDetectRisksPrompt(projectName, standupDate)
  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const context = JSON.stringify(
    {
      projectId,
      standupDate,
      attendance,
      extractedTasks,
      matchResults,
      deadlineResolutions,
      hourEstimates,
      existingTasksByResource,
    },
    null,
    2
  )

  const response = await invokeWithLogging<{ content: string }>(
    model,
    [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Standup data:\n${context}`),
    ],
    { nodeName: 'detect-risks', standupId, model: modelId, provider }
  )

  const rawJson = (response as unknown as { content: string }).content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(rawJson)
  const detectedRisks = ExtractedRiskSchema.array().parse(parsed)

  return { detectedRisks }
}
