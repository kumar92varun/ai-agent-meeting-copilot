import { HINGLISH_FEW_SHOT_EXAMPLES, HINGLISH_TIME_WORDS } from './hinglish-examples'

export function buildExtractTasksPrompt(standupDate: string): string {
  const examples = HINGLISH_FEW_SHOT_EXAMPLES
    .map((e) => `  Hinglish: "${e.hinglish}" → English: "${e.english}" [confidence: ${e.commitmentConfidence}]`)
    .join('\n')
  const timeWords = Object.entries(HINGLISH_TIME_WORDS)
    .map(([k, v]) => `  "${k}" = ${v}`)
    .join('\n')

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

TASK: For each speaker segment, extract:
1. Work reported as COMPLETED YESTERDAY (past commitments fulfilled)
2. Work COMMITTED FOR TODAY (new tasks + deadlines)
3. Any BLOCKERS mentioned

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
  "rawQuote": "exact original Hinglish text from transcript"
}

Return ONLY valid JSON array, no markdown.`
}
