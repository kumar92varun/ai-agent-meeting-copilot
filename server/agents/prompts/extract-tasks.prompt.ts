import { HINGLISH_FEW_SHOT_EXAMPLES, HINGLISH_TIME_WORDS } from './hinglish-examples'

export function buildExtractTasksPrompt(
  standupDate: string,
  clientMembers: Array<{ name: string; inferredRole: string | null }>
): string {
  const examples = HINGLISH_FEW_SHOT_EXAMPLES
    .map((e) => `  Hinglish: "${e.hinglish}" → English: "${e.english}" [confidence: ${e.commitmentConfidence}]`)
    .join('\n')
  const timeWords = Object.entries(HINGLISH_TIME_WORDS)
    .map(([k, v]) => `  "${k}" = ${v}`)
    .join('\n')
  const clientMemberListStr = clientMembers.length
    ? clientMembers.map((c) => `- ${c.name}${c.inferredRole ? ` (${c.inferredRole})` : ''}`).join('\n')
    : '  (none identified in this standup)'

  return `You are an AI assistant that extracts task information from standup transcripts.

STANDUP DATE: ${standupDate}

INPUT LANGUAGE:
- Input may contain Hindi-English code-switching in Devanagari or Romanized script
- Understand Hindi portions and produce ALL structured output in ENGLISH
- Preserve original Hinglish phrasing ONLY in the raw_quote field
- Common Hinglish time expressions:
${timeWords}

COMMITMENT CONFIDENCE RULES:
- "firm": explicit, specific commitment ("I will complete X by EOD", "done aaj")
- "vague": soft positive language ("ho jayega", "try karta hu", "dekhta hu", "almost done")
- "aspirational": clearly uncertain or conditional ("maybe", "if time allows", "shayad")

FEW-SHOT EXAMPLES:
${examples}

CLIENT TEAM MEMBERS PRESENT IN THIS STANDUP:
${clientMemberListStr}

CLIENT MEMBER LINK RULES:
- For each extracted task, check if a client team member assigned it, was mentioned as the requester, or is expected to review/approve the output
- "assigned_by": client member explicitly told our resource to do this task (e.g. "Danny told me to...", "उन्होंने बोला कि...")
- "mentioned_by": client member was referenced in context (e.g. "Danny pinged a ticket", "need to discuss with Danny")
- "reviewing": client member is explicitly expected to review or approve the result
- A task can link to multiple client members with different assignment types

TASK: For each speaker segment, extract:
1. Work reported as COMPLETED YESTERDAY (past commitments fulfilled)
2. Work COMMITTED FOR TODAY (new tasks + deadlines)
3. Any BLOCKERS mentioned

Also consider Fathom ACTION ITEMs embedded in the transcript as supplementary signals — they confirm or add detail to tasks you've already extracted. Do not create duplicate tasks for them; instead, enrich existing extracted tasks if the action item adds new information.

For each task item output:
{
  "resourceId": "the matched resource id from parser",
  "type": "completed|committed|blocker",
  "title": "concise English task title",
  "description": "English description with enough detail to be actionable",
  "deadlinePhrase": "original phrase used e.g. 'kal', 'by Friday', 'eod'",
  "estimatedHours": number or null (only if developer explicitly stated hours),
  "commitmentConfidence": "firm|vague|aspirational",
  "isCarriedOver": boolean (true if mentioned as carry-forward from previous day),
  "rawQuote": "exact original Hinglish text from transcript",
  "clientMemberLinks": [
    { "clientMemberName": "name as it appears in transcript", "assignmentType": "assigned_by|mentioned_by|reviewing" }
  ]
}

Return results in the items array of the structured output schema.`
}
