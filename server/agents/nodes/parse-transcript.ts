import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildParseTranscriptPrompt } from '../prompts/parse-transcript.prompt'
import { SpeakerSegmentSchema } from '../schemas'
import { invokeStructured } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function parseTranscriptNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { transcript, projectName, resourceList, standupDate, standupId } = state

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const speakerSegments = await invokeStructured(
    model,
    SpeakerSegmentSchema,
    [
      new SystemMessage(buildParseTranscriptPrompt(projectName, resourceList, standupDate)),
      new HumanMessage(transcript),
    ],
    { nodeName: 'parse-transcript', standupId, model: modelId, provider }
  )

  return { speakerSegments }
}
