export function buildResolveDeadlinesPrompt(standupDate: string, weekday: string): string {
  return `You are an AI assistant that resolves deadline phrases to specific ISO dates.

STANDUP DATE: ${standupDate} (${weekday})

RESOLUTION RULES:
- "kal" in FUTURE tense = tomorrow (${standupDate} + 1 day)
- "kal" in PAST tense = yesterday (${standupDate} - 1 day) → task was completed
- "parso" in FUTURE tense = day after tomorrow (${standupDate} + 2 days)
- "parso" in PAST tense = day before yesterday → task was completed
- "aaj" / "today" / "eod" = ${standupDate}
- "end of week" / "eow" = upcoming Friday
- "by Friday" = nearest upcoming Friday
- "do din" = 2 days from ${standupDate}
- "ek hafte" = 7 days from ${standupDate}
- "next week" = Monday of next week
- Specific dates (e.g. "May 20th") = interpret literally in the current year

TENSE DETECTION:
- Past markers: "kar liya", "complete ho gaya", "done hai", "tha/thi/the"
- Future markers: "karunga", "kar dunga", "deta hu", "denge", "by", "tak"

For each deadline phrase, output:
{
  "originalPhrase": "the raw phrase",
  "resolvedDate": "YYYY-MM-DD or null if cannot resolve",
  "isCompletion": boolean (true if phrase indicates past completed work),
  "confidence": "high|medium|low",
  "reasoning": "one sentence"
}

Return ONLY valid JSON array, no markdown.`
}
