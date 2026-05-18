import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildParseTranscriptPrompt, extractFathomActionItems } from '../prompts/parse-transcript.prompt'
import { SpeakerSegmentSchema } from '../schemas'
import type { ClientTeamMemberItem } from '../schemas'
import { invokeStructured } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'

export async function parseTranscriptNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { transcript, projectName, resourceList, knownClientMembers, standupDate, standupId } = state

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  // Extract Fathom ACTION ITEMs synchronously before the LLM call
  const fathomActionItems = extractFathomActionItems(transcript)

  const speakerSegments = await invokeStructured(
    model,
    SpeakerSegmentSchema,
    [
      new SystemMessage(buildParseTranscriptPrompt(projectName, resourceList, knownClientMembers, standupDate)),
      new HumanMessage(transcript),
    ],
    { nodeName: 'parse-transcript', standupId, model: modelId, provider }
  )

  // Derive identified client team members from segments flagged as client-side,
  // deduplicating by speaker label and excluding any already in knownClientMembers
  const knownClientNames = new Set(knownClientMembers.map((c) => c.name.toLowerCase()))
  const seenLabels = new Set<string>()
  const identifiedClientMembers: ClientTeamMemberItem[] = []

  for (const seg of speakerSegments) {
    if (!seg.isClientTeamMember) continue
    const label = seg.speakerLabel.toLowerCase()
    if (seenLabels.has(label) || knownClientNames.has(label)) continue
    seenLabels.add(label)
    identifiedClientMembers.push({ name: seg.speakerLabel, inferredRole: null })
  }

  return { speakerSegments, identifiedClientMembers, fathomActionItems }
}
