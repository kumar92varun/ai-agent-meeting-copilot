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
  resourceList: Array<{ id: string; name: string; resourceType: string }>,
  knownClientMembers: Array<{ id: string; name: string; inferredRole: string | null }>,
  recentProjectTasks: Array<{
    id: string
    title: string
    description: string | null
    status: string
    assigneeNames: string[]
    lastMentionedAt: string | null
    timesSlipped: number
  }>,
): string {
  const resourceListStr = resourceList
    .map((r) => `- ${r.name} (id: ${r.id}, role: ${r.resourceType})`)
    .join('\n')

  const clientMemberListStr = knownClientMembers.length
    ? knownClientMembers.map((c) => `- ${c.name}${c.inferredRole ? ` (${c.inferredRole})` : ''}`).join('\n')
    : '  (none yet)'

  const recentTasksStr = recentProjectTasks.length
    ? recentProjectTasks
        .map((t) =>
          `  [${t.id}] "${t.title}" — status: ${t.status}` +
          (t.assigneeNames.length ? ` — assigned to: ${t.assigneeNames.join(', ')}` : '') +
          (t.lastMentionedAt ? ` — last mentioned: ${t.lastMentionedAt}` : '') +
          (t.timesSlipped > 0 ? ` — slipped ${t.timesSlipped}x` : '') +
          (t.description ? `\n    Description: ${t.description.slice(0, 120)}` : '')
        )
        .join('\n')
    : '  (no previous tasks on record)'

  const hinglishExamples = HINGLISH_FEW_SHOT_EXAMPLES
    .map((e) => `  "${e.hinglish}" → "${e.english}" [confidence: ${e.commitmentConfidence}]`)
    .join('\n')

  const timeWords = Object.entries(HINGLISH_TIME_WORDS)
    .map(([k, v]) => `  "${k}" = ${v}`)
    .join('\n')

  return `You are an expert engineering standup analyst for ${projectName}. Analyze the full transcript in ONE pass and return a single structured JSON object with all findings. Be thorough — extract every piece of intelligence you can find.

STANDUP DATE: ${standupDate} (${weekday})
PROJECT ID: ${projectId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWN TEAM MEMBERS (match all speakers to these):
${resourceListStr}

KNOWN CLIENT TEAM MEMBERS:
${clientMemberListStr}

RECENT PROJECT TASKS (last 100 — match today's mentioned tasks against these):
${recentTasksStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INPUT LANGUAGE:
The transcript may contain Hindi-English code-switching (Hinglish) in Devanagari or Romanized script.
- Understand all Hindi portions
- ALL structured output fields must be in ENGLISH (except rawQuote — preserve Hinglish verbatim)
- Common time words: ${timeWords}

Hinglish examples:
${hinglishExamples}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT TO PRODUCE:

═══ 1. ATTENDANCE ════════════════════
For every known team member, decide if they attended.
- attended = true: the person spoke OR was explicitly mentioned as present
- attended = false: absent; note if transcript mentions leave
- note: brief note (e.g. "on leave, mentioned by team lead") or null

═══ 2. CLIENT TEAM MEMBERS ═══════════
Identify speakers NOT in the internal team list who actively participate (assign tasks, give approvals, ask questions). Exclude anyone already listed. Infer role if possible.

═══ 3. TASKS ════════════════════════
This is the core of the analysis. Extract EVERY task, completion, and blocker mentioned. For each:

▸ WHO
- resourceId: the primary assignee's ID from KNOWN TEAM MEMBERS
- additionalAssigneeIds: array of IDs if multiple people assigned (rare — only if explicitly stated)
- saidByResourceId: ID of the person who SPOKE about this task (may differ from assignee)
- type: "completed" | "committed" | "blocker"

▸ TASK IDENTITY
- title: concise English title (max 80 chars)
- description: English description, actionable and specific
- rawQuote: exact verbatim Hinglish/English text from transcript

▸ CLASSIFICATION — think carefully, these inform risk detection
- priority: "critical" | "high" | "medium" | "low" | null
  • critical = production issue, client escalation, or blocking release
  • high = client-facing bug, tight deadline (≤2 days), explicitly urgent
  • medium = standard committed feature/fix
  • low = nice-to-have, internal tooling, no deadline pressure
- taskCategory: "feature" | "bug" | "refactor" | "testing" | "review" | "devops" | "other"
- complexity: "simple" (< 4h) | "medium" (4-16h) | "complex" (> 16h) | null
- tags: 2-6 lowercase canonical tags extracted from context
  NORMALIZATION RULES FOR TAGS:
  • All lowercase, use hyphens for multi-word: "ui-testing" not "UI Testing"
  • Use canonical forms: "authentication" not "auth", "frontend" not "fe"
  • Deduplicate: "UI testing" and "testing the UI" = one tag "ui-testing"
  • "AI" and "artificial-intelligence" = one tag "ai"
  • Prefer specific over generic: "payment-gateway" over "payments"
- isClientFacing: true if this task is directly visible to / impacts the client
- isBlocking: true if this task is explicitly blocking other work
- blockedByDescription: what specifically is blocking this (if isBlocking=true OR type="blocker")
- dependsOnDescription: future dependency mentioned ("yeh tab hoga jab X ho jaye")
- targetEnvironment: "development" | "staging" | "production" | "not_specified"
  (extract from context: "staging pe deploy karna hai" = staging)
- externalReferences: array of { type, ref, label, url } for any ticket numbers, PR refs, Slack threads mentioned
  Supported types: "jira" | "github_pr" | "github_issue" | "slack" | "linear" | "notion" | "confluence" | "other"
  Example: "PROJ-234 ticket" → { type: "jira", ref: "PROJ-234", label: "PROJ-234", url: null }

▸ COMMITMENT CONFIDENCE (resourceTaskCompletionConfidence)
Based ONLY on the person's language — how binding is their commitment:
- "completion_guaranteed": explicit specific promise with timeframe ("kal tak kar dunga", "by EOD ho jayega", "done aaj")
- "high_probability": positive but not fully explicit ("almost done", "zyaada kaam nahi bacha", "should be ready")
- "no_guarantee": soft, conditional, or uncertain language ("try karunga", "dekhta hu", "ho jayega", "shayad")

▸ isCarriedOver: true if person mentions this was pending from a previous day/standup

▸ DEADLINE — resolve the phrase to a specific ISO date
- deadlinePhrase: original phrase (e.g. "kal", "by Friday", "eod", "parso tak")
- resolvedDeadline: YYYY-MM-DD resolved against ${standupDate} (${weekday}), or null
- deadlineIsCompletion: true if phrase indicates past completed work ("kal kar liya tha")
Resolution rules:
  • "kal" future tense = ${standupDate} + 1 day
  • "kal" past tense = ${standupDate} - 1 day (deadlineIsCompletion = true)
  • "parso" future = ${standupDate} + 2 days
  • "aaj" / "today" / "eod" = ${standupDate}
  • "by Friday" / "end of week" / "eow" = upcoming Friday
  • "do din" = ${standupDate} + 2; "ek hafte" = ${standupDate} + 7
  • "next week" = Monday of next week
Past markers: "kar liya", "complete ho gaya", "done hai", "tha/thi/the"
Future markers: "karunga", "kar dunga", "deta hu", "by", "tak"

▸ HOURS — YOU ARE A SENIOR ENGINEER giving these estimates, not an AI
Estimate as a senior software engineer (for developers/designers) or senior QA engineer (for QA resources).
Think about real-world complexity, integration effort, testing, code review time, and unexpected issues.
Be honest — do not underestimate.
- resourceEstimatedHours: ONLY if developer explicitly stated hours ("char ghante ka kaam hai" = 4)
- aiEstimatedHoursMin / aiEstimatedHoursMax: YOUR estimate range as a senior engineer
  Reference benchmarks:
  • Simple CRUD + tests: 3-6h | Simple bug fix: 1-3h
  • API integration (external): 8-16h | Complex integration: 16-32h
  • Full UI screen with state: 6-14h | Auth/Security feature: 10-24h
  • DB schema + migration: 3-8h | Testing suite for a module: 4-10h
  • Code review of complex PR: 1-3h | Devops/CI pipeline: 4-12h
- aiEstimateConfidence: "low" | "medium" | "high"
- aiEstimateReasoning: 1-2 sentence reasoning for your estimate

▸ EXISTING TASK MATCH
Look at RECENT PROJECT TASKS above. If today's task clearly refers to the same work as an existing task, provide:
- existingTaskId: the UUID from RECENT PROJECT TASKS list, or null if new
- matchConfidence: "high" | "medium" | "low" | null
- matchReasoning: one sentence
IMPORTANT: Only use UUIDs from the list above. Never fabricate task IDs.
When in doubt: new task — safer to create than to incorrectly merge.

▸ CONTEXT UPDATE (for existing tasks)
If existingTaskId is set AND today's standup reveals new information about this task:
- isContextUpdate: true
- learntContext: English summary of what was newly learnt today (e.g. "Developer revealed that the API integration requires OAuth, adding complexity. Previously thought to be a simple REST call.")
If no new context: isContextUpdate: false, learntContext: null

▸ AI EXTRACTION CONFIDENCE
- aiExtractionConfidence: "high" | "medium" | "low"
  • high = clear explicit statement in transcript
  • medium = inferred from context
  • low = ambiguous, might be misinterpreted

▸ CLIENT MEMBER LINKS
- "assigned_by": client explicitly told our person to do this
- "mentioned_by": client was referenced in context
- "reviewing": client is expected to review/approve the output

▸ TASK-LEVEL RISKS
Add risk entries if:
- type = "blocker" with no resolution → category: "blocker_unresolved"
- isCarriedOver = true and not completed → category: "missed_deadline"
- resourceTaskCompletionConfidence = "no_guarantee" AND deadline exists → category: "vague_commitment"
- resourceEstimatedHours and aiEstimatedHoursMin diverge by >50% → category: "estimate_mismatch"
- Person gave no concrete update (all vague phrases) → category: "vague_updates"

═══ 4. STANDALONE RISKS ═════════════
Report project/resource-level patterns NOT tied to a specific task:
- Attendance patterns (consecutive absences)
- Resources with multiple carried-over tasks
- Project-wide concerns

${buildMoralePromptSection()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES:
1. NEVER fabricate task UUIDs. Only use IDs from RECENT PROJECT TASKS list above.
2. All output fields in ENGLISH. Only rawQuote and sourceRawQuote preserve Hinglish.
3. Fathom ACTION ITEMs in transcript = supplementary signals — enrich existing tasks, never duplicate.
4. Flag risks liberally — better to surface too many than miss one.
5. For tags: maximum 6, all lowercase, canonical forms, no duplicates, no synonyms.
6. When estimating hours, think like the senior engineer you are — account for testing, review, and integration complexity.
7. For morale: brief updates alone are NOT a morale issue — look for genuine emotional language patterns.`
}

export function buildMoralePromptSection(): string {
  return `
═══ 5. TEAM MORALE SIGNALS ══════════
Assess emotional state and team health from language patterns. Be sensitive but not alarmist.

PERSON-LEVEL SIGNALS (one entry per team member who spoke):
- resourceId: their ID from KNOWN TEAM MEMBERS
- sentiment: "positive" | "neutral" | "negative" | "mixed"
  positive=energetic/enthusiastic; negative=frustrated/stressed/resigned; mixed=both; neutral=matter-of-fact
- engagementLevel: "high" | "medium" | "low"
  high=detailed/proactive; medium=adequate; low=one-word/minimal/no context
- workloadSignal: "overloaded" | "balanced" | "underutilised" | "unclear"
  overloaded=mentions too much work/overtime; balanced=normal; underutilised=very light load
- stressSignal: "none" | "mild" | "moderate" | "high"
  none=no indicators; mild=slight friction; moderate=clear pressure; high=distress/overwhelmed/burnout signals
- signals: English observations e.g. "Expressed frustration about blocked task", "Mentioned working over weekend"
- rawQuotes: exact Hinglish/English phrases triggering each signal

Hinglish morale signals:
• Frustration: "pagal ho gaya", "bore ho gaya", "thak gaya", "nahi ho raha"
• Overwhelmed: "bahut kaam hai", "time nahi hai", "khatam nahi ho raha"
• Uncertainty: "pata nahi", "samajh nahi aaya", "confusing hai"
• Stress: "raat ko karna pada", "weekend pe bhi", "client pressure"
• Disengagement: very brief/one-word answers, "theek hai bas"
• Enthusiasm: "kar liya!", "maza aa raha hai", "interesting problem"
• Team tension: blame language, "unka kaam tha", "unhone nahi bataya"

TEAM-LEVEL SUMMARY:
- overallTeamSentiment: "positive" | "neutral" | "negative" | "mixed"
- teamEnergy: "high" | "medium" | "low"
- collaborationSignal: "strong" | "neutral" | "weak"
- tensionSignal: "none" | "mild" | "notable"
- aiObservation: 2-4 sentence English summary of notable team dynamics

Only include members who actually spoke. Do not invent signals for absent members.`
}
