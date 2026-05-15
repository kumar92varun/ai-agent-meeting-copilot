import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildParseTranscriptPrompt } from '../prompts/parse-transcript.prompt'
import { SpeakerSegmentSchema } from '../schemas'
import { invokeWithLogging } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function parseTranscriptNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { transcript, projectName, resourceList, standupDate, standupId } = state

  const systemPrompt = buildParseTranscriptPrompt(projectName, resourceList, standupDate)
  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const response = await invokeWithLogging<{ content: string }>(
    model,
    [new SystemMessage(systemPrompt), new HumanMessage(transcript)],
    { nodeName: 'parse-transcript', standupId, model: modelId, provider }
  )

  const rawJson = (response as unknown as { content: string }).content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(rawJson)
  const segments = SpeakerSegmentSchema.array().parse(parsed)

  return { speakerSegments: segments }
}
