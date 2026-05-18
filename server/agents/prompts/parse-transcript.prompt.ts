import { HINGLISH_FEW_SHOT_EXAMPLES, HINGLISH_TIME_WORDS } from './hinglish-examples'

export function buildParseTranscriptPrompt(
  projectName: string,
  resourceList: Array<{ id: string; name: string }>,
  knownClientMembers: Array<{ id: string; name: string; inferredRole: string | null }>,
  standupDate: string
): string {
  const resourceListStr = resourceList.map((r) => `- ${r.name} (id: ${r.id})`).join('\n')
  const clientMemberListStr = knownClientMembers.length
    ? knownClientMembers.map((c) => `- ${c.name}${c.inferredRole ? ` (${c.inferredRole})` : ''}`).join('\n')
    : '  (none yet)'
  const examples = HINGLISH_FEW_SHOT_EXAMPLES.slice(0, 6)
    .map((e) => `  "${e.hinglish}" → "${e.english}"`)
    .join('\n')
  const timeWords = Object.entries(HINGLISH_TIME_WORDS)
    .map(([k, v]) => `  "${k}" = ${v}`)
    .join('\n')

  return `You are an AI assistant that parses daily standup transcripts for ${projectName}.

TASK: Segment the transcript by speaker. For each segment:
1. Identify which known team member the speaker is (if any)
2. Flag speakers who are client-side people (not on our internal team)

STANDUP DATE: ${standupDate}

KNOWN TEAM MEMBERS (our internal resources — match speakers to these):
${resourceListStr}

KNOWN CLIENT TEAM MEMBERS (already recorded from past standups):
${clientMemberListStr}

SPEAKER CLASSIFICATION RULES:
- Match to a known team member if the speaker name closely resembles any name in the list (allow phonetic mangling by transcription tools)
- If a speaker clearly does NOT match any internal resource but IS an active participant: flag isClientTeamMember = true
- Client team members are people from the client company who collaborate with our team — e.g. product owners, project managers, technical leads on the client side
- Do NOT flag pure transcription artifacts or noise as client team members
- Use context clues: client team members often assign tasks, approve work, or discuss product requirements
- Names with company suffixes like "CS", "Writtek", or other non-Crownstack company names are strong signals of client team members

INPUT LANGUAGE:
- The transcript may contain Hindi-English code-switching (Hinglish) in Devanagari or Romanized script
- Understand the meaning of Hindi portions. Do NOT translate at this stage — preserve original wording
- Common time words: ${timeWords}

EXAMPLES of Hinglish in transcripts:
${examples}

OUTPUT: For each speaker segment, produce one item:
{
  "speakerLabel": "original label from transcript",
  "matchedResourceId": "uuid or null",
  "matchedResourceName": "name or null",
  "matchConfidence": "high|medium|low",
  "isClientTeamMember": boolean,
  "text": "the speaker's verbatim transcript text"
}

Return results in the items array of the structured output schema.`
}

export function extractFathomActionItems(transcript: string): string[] {
  const pattern = /ACTION ITEM:\s*([^\n\-]+?)(?:\s*-\s*WATCH:.*)?$/gm
  const items: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(transcript)) !== null) {
    const item = match[1].trim()
    if (item) items.push(item)
  }
  return items
}
