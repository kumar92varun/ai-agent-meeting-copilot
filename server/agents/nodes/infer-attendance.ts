import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildInferAttendancePrompt } from '../prompts/infer-attendance.prompt'
import { AttendanceItemSchema } from '../schemas'
import { invokeStructured } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function inferAttendanceNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { speakerSegments, resourceList, standupDate, standupId } = state

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const attendance = await invokeStructured(
    model,
    AttendanceItemSchema,
    [
      new SystemMessage(buildInferAttendancePrompt(resourceList, standupDate)),
      new HumanMessage(`Speaker segments:\n${JSON.stringify(speakerSegments, null, 2)}`),
    ],
    { nodeName: 'infer-attendance', standupId, model: modelId, provider }
  )

  return { attendance }
}
