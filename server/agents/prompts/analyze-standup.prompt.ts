import { HINGLISH_FEW_SHOT_EXAMPLES, HINGLISH_TIME_WORDS } from './hinglish-examples'

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

export function buildAnalyzeStandupPrompt(
  projectName: string,
  projectId: string,
  standupDate: string,
  weekday: string,
  resourceList: Array<{ id: string; name: string }>,
  knownClientMembers: Array<{ id: string; name: string; inferredRole: string | null }>,
  existingTasksByResource: Record<string, Array<{ id: string; title: string; description: string | null; status: string }>>,
): string {
  const resourceListStr = resourceList
    .map((r) => `- ${r.name} (id: ${r.id})`)
    .join('\n')

  const clientMemberListStr = knownClientMembers.length
    ? knownClientMembers.map((c) => `- ${c.name}${c.inferredRole ? ` (${c.inferredRole})` : ''}`).join('\n')
    : '  (none yet)'

  const existingTasksStr = resourceList
    .map((r) => {
      const taskList = existingTasksByResource[r.id] ?? []
      if (!taskList.length) return `${r.name}: (no open tasks on record)`
      return `${r.name} (${r.id}):\n${taskList.map((t) => `  - [${t.id}] "${t.title}" — status: ${t.status}`).join('\n')}`
    })
    .join('\n\n')

  const hinglishExamples = HINGLISH_FEW_SHOT_EXAMPLES
    .map((e) => `  "${e.hinglish}" → "${e.english}" [confidence: ${e.commitmentConfidence}]${e.note ? ` — ${e.note}` : ''}`)
    .join('\n')

  const timeWords = Object.entries(HINGLISH_TIME_WORDS)
    .map(([k, v]) => `  "${k}" = ${v}`)
    .join('\n')

  return `You are an AI analyst for ${projectName}'s daily standup. Analyze the full transcript in one pass and return a single structured JSON object with all findings.

STANDUP DATE: ${standupDate} (${weekday})
PROJECT ID: ${projectId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWN TEAM MEMBERS (internal resources — match all speakers to these):
${resourceListStr}

KNOWN CLIENT TEAM MEMBERS (from past standups):
${clientMemberListStr}

OPEN TASKS PER RESOURCE (existing tasks to match against):
${existingTasksStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INPUT LANGUAGE:
The transcript may contain Hindi-English code-switching (Hinglish) in Devanagari or Romanized script.
- Understand all Hindi portions
- Produce ALL structured output fields in ENGLISH (except rawQuote fields — preserve Hinglish there)
- Common time words:
${timeWords}

Hinglish few-shot examples:
${hinglishExamples}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO PRODUCE — fill every section of the output schema:

1. ATTENDANCE
   For every known team member, decide if they attended.
   - attended = true: the person spoke OR was explicitly mentioned as present
   - attended = false: absent; if transcript mentions planned leave, note it
   - confidence: how certain you are based on the transcript

2. CLIENT TEAM MEMBERS
   Identify any speakers who are NOT in the known internal resource list but are active participants (ask questions, assign tasks, give approvals). These are client-side people. Do NOT include transcription artifacts.
   - Exclude anyone already listed in KNOWN CLIENT TEAM MEMBERS above
   - Infer their role if possible (e.g. "Product Owner", "Technical Lead")

3. TASKS — this is the core of the analysis
   For every speaker segment, extract:
   a) Work reported as COMPLETED (yesterday / past)
   b) Work COMMITTED FOR TODAY / upcoming (new tasks + deadlines)
   c) BLOCKERS mentioned

   For each task, fill ALL of the following in one shot — do not leave fields empty when information is available:

   TASK IDENTITY:
   - resourceId: the matched resource's ID from KNOWN TEAM MEMBERS
   - type: "completed" | "committed" | "blocker"
   - title: concise English title
   - description: English description with enough detail to be actionable
   - rawQuote: exact original Hinglish text from transcript (preserve verbatim)
   - isCarriedOver: true if explicitly mentioned as carry-forward from a previous day

   COMMITMENT CONFIDENCE:
   - "firm": explicit specific commitment ("I will complete X by EOD", "done aaj")
   - "vague": soft positive language ("ho jayega", "try karta hu", "dekhta hu", "almost done")
   - "aspirational": clearly uncertain or conditional ("maybe", "if time allows", "shayad")

   CLIENT LINKS (for each task, check if a client member assigned it, was mentioned, or will review):
   - "assigned_by": client explicitly told our resource to do this
   - "mentioned_by": client was referenced in context
   - "reviewing": client is expected to review/approve the output

   DEADLINE (resolve the phrase to an ISO date in context of ${standupDate}):
   - deadlinePhrase: the original phrase (e.g. "kal", "by Friday", "eod")
   - resolvedDeadline: YYYY-MM-DD or null if not resolvable
   - deadlineIsCompletion: true if the phrase describes past completion (e.g. "kal kar liya tha")
   Deadline resolution rules:
   - "kal" future tense = ${standupDate} + 1 day
   - "kal" past tense = ${standupDate} - 1 day (isCompletion = true)
   - "parso" future = ${standupDate} + 2 days; past = isCompletion = true
   - "aaj" / "today" / "eod" = ${standupDate}
   - "end of week" / "eow" = upcoming Friday
   - "do din" = ${standupDate} + 2; "ek hafte" = ${standupDate} + 7
   - "next week" = Monday of next week
   Past markers: "kar liya", "complete ho gaya", "done hai", "tha/thi/the"
   Future markers: "karunga", "kar dunga", "deta hu", "by", "tak"

   HOURS:
   - resourceEstimatedHours: ONLY if the developer explicitly stated hours ("char ghante ka kaam hai" = 4)
   - aiEstimatedHoursMin/Max: your estimate range (even if developer stated hours, still provide AI estimate)
   - aiEstimateConfidence: how confident you are in your estimate
   - aiEstimateReasoning: one sentence
   Estimation guidelines:
   - Simple CRUD features: 2–8 h | Complex integrations: 8–24 h
   - UI screens (full implementation): 4–16 h | Bug fixes: 1–4 h
   - Testing tasks: 2–8 h | API design + impl: 8–20 h | DB schema changes: 2–6 h

   MATCH TO EXISTING TASK:
   Look at the OPEN TASKS listed above for this resource. If the extracted task clearly refers to the same work as an existing task (allow paraphrasing, Hinglish variation), provide:
   - existingTaskId: the task UUID from OPEN TASKS, or null if new
   - matchConfidence: high | medium | low | null
   - matchReasoning: one sentence
   When in doubt, treat as a new task — safer to create than to incorrectly merge.

   TASK-LEVEL RISKS (risks directly caused by this specific task):
   Add a risk entry for this task if any of the following are true:
   - blocker_unresolved: type is "blocker" with no resolution described
   - missed_deadline: task was committed in a previous standup (isCarriedOver = true) but not completed
   - vague_commitment: commitmentConfidence is "vague" or "aspirational" AND a deadline exists
   - estimate_mismatch: resourceEstimatedHours and AI estimate diverge by >50%
   - vague_updates: the resource's update on this task has no concrete progress
   Severity rules: critical = client escalation or prod down; high = missed client-facing deadline or blocker 2+ days;
   medium = 2+ slippages or vague update on important work; low = single vague commitment or first-time miss

4. STANDALONE RISKS (risks NOT tied to a specific task)
   Report project-level and resource-level patterns:
   - low_attendance: any resource absent from multiple consecutive standups
   - frequent_slippage: any resource with a pattern of slipping tasks
   - other: any other project-wide concern not captured in a task risk
   For each: riskType ("project" | "resource"), resourceId (or null for project risks), category, severity, title, description, aiReasoning, sourceRawQuote

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT RULES:
- Do NOT hallucinate task IDs. Only use IDs from the OPEN TASKS list above.
- All structured output fields must be in ENGLISH. Only rawQuote and sourceRawQuote preserve Hinglish.
- Fathom ACTION ITEMs in the transcript (if any) are supplementary signals — enrich existing extracted tasks, do not create duplicates.
- Flag liberally on risks — better to surface too many than miss one.
- A task can appear as both "completed" (what was done) and trigger a risk (if it was supposed to be done earlier).`
}
