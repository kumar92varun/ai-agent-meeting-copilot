import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildDetectRisksPrompt } from '../prompts/detect-risks.prompt'
import { ExtractedRiskSchema } from '../schemas'
import { invokeStructured } from '../../llm/logging'
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

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const context = JSON.stringify(
    { projectId, standupDate, attendance, extractedTasks, matchResults, deadlineResolutions, hourEstimates, existingTasksByResource },
    null,
    2
  )

  const detectedRisks = await invokeStructured(
    model,
    ExtractedRiskSchema,
    [
      new SystemMessage(buildDetectRisksPrompt(projectName, standupDate)),
      new HumanMessage(`Standup data:\n${context}`),
    ],
    { nodeName: 'detect-risks', standupId, model: modelId, provider }
  )

  return { detectedRisks }
}
