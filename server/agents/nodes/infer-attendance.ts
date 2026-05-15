import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildInferAttendancePrompt } from '../prompts/infer-attendance.prompt'
import { AttendanceItemSchema } from '../schemas'
import { invokeWithLogging } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function inferAttendanceNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { speakerSegments, resourceList, standupDate, standupId } = state

  const systemPrompt = buildInferAttendancePrompt(resourceList, standupDate)
  const segmentsContext = JSON.stringify(speakerSegments, null, 2)

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const response = await invokeWithLogging<{ content: string }>(
    model,
    [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Speaker segments:\n${segmentsContext}`),
    ],
    { nodeName: 'infer-attendance', standupId, model: modelId, provider }
  )

  const rawJson = (response as unknown as { content: string }).content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(rawJson)
  const attendance = AttendanceItemSchema.array().parse(parsed)

  return { attendance }
}
