import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildEstimateHoursPrompt } from '../prompts/estimate-hours.prompt'
import { HourEstimateSchema } from '../schemas'
import { invokeStructured } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function estimateHoursNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { extractedTasks, standupId } = state

  const tasksNeedingEstimate = extractedTasks
    .map((t, i) => ({ index: i, task: t }))
    .filter(({ task }) => task.type === 'committed' && task.estimatedHours == null)

  if (!tasksNeedingEstimate.length) return { hourEstimates: [] }

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const hourEstimates = await invokeStructured(
    model,
    HourEstimateSchema,
    [
      new SystemMessage(buildEstimateHoursPrompt()),
      new HumanMessage(`Tasks to estimate:\n${JSON.stringify(tasksNeedingEstimate, null, 2)}`),
    ],
    { nodeName: 'estimate-hours', standupId, model: modelId, provider }
  )

  return { hourEstimates }
}
