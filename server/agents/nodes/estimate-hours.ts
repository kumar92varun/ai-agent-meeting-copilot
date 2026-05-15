import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildEstimateHoursPrompt } from '../prompts/estimate-hours.prompt'
import { HourEstimateSchema } from '../schemas'
import { invokeWithLogging } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function estimateHoursNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { extractedTasks, standupId } = state

  // Only estimate for committed tasks without an explicit developer estimate
  const tasksNeedingEstimate = extractedTasks
    .map((t, i) => ({ index: i, task: t }))
    .filter(({ task }) => task.type === 'committed' && task.estimatedHours == null)

  if (!tasksNeedingEstimate.length) return { hourEstimates: [] }

  const systemPrompt = buildEstimateHoursPrompt()
  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const response = await invokeWithLogging<{ content: string }>(
    model,
    [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Tasks to estimate:\n${JSON.stringify(tasksNeedingEstimate, null, 2)}`),
    ],
    { nodeName: 'estimate-hours', standupId, model: modelId, provider }
  )

  const rawJson = (response as unknown as { content: string }).content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(rawJson)
  const hourEstimates = HourEstimateSchema.array().parse(parsed)

  return { hourEstimates }
}
