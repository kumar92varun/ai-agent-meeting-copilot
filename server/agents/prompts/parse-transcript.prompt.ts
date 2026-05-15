import { HINGLISH_FEW_SHOT_EXAMPLES, HINGLISH_TIME_WORDS } from './hinglish-examples'

export function buildParseTranscriptPrompt(
  projectName: string,
  resourceList: Array<{ id: string; name: string }>,
  standupDate: string
): string {
  const resourceListStr = resourceList.map((r) => `- ${r.name} (id: ${r.id})`).join('\n')
  const examples = HINGLISH_FEW_SHOT_EXAMPLES.slice(0, 6)
    .map((e) => `  "${e.hinglish}" → "${e.english}"`)
    .join('\n')
  const timeWords = Object.entries(HINGLISH_TIME_WORDS)
    .map(([k, v]) => `  "${k}" = ${v}`)
    .join('\n')

  return `You are an AI assistant that parses daily standup transcripts for ${projectName}.

TASK: Segment the transcript by speaker. Identify which known team member each speaker corresponds to.

STANDUP DATE: ${standupDate}

KNOWN TEAM MEMBERS (match speakers to these):
${resourceListStr}

SPEAKER MATCHING RULES:
- Names in transcripts may be phonetically mangled by transcription tools (e.g. "Varun" → "Wow run")
- Use phonetic similarity and context to match speakers to known team members
- If a speaker cannot be confidently matched, mark them as "unknown"
- Multiple speakers may share short turns; group continuous turns by the same speaker

INPUT LANGUAGE:
- The transcript may contain Hindi-English code-switching (Hinglish) in Devanagari or Romanized script
- Understand the meaning of Hindi portions. Do NOT translate at this stage — preserve original wording
- Common time words: ${timeWords}

EXAMPLES of Hinglish in transcripts:
${examples}

OUTPUT: Return a JSON array of speaker segments. Each segment:
{
  "speakerLabel": "original label from transcript",
  "matchedResourceId": "uuid or null",
  "matchedResourceName": "name or null",
  "matchConfidence": "high|medium|low",
  "text": "the speaker's verbatim transcript text"
}

Return ONLY valid JSON array, no markdown.`
}
