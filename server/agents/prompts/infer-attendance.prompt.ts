export function buildInferAttendancePrompt(
  resourceList: Array<{ id: string; name: string }>,
  standupDate: string
): string {
  const resourceListStr = resourceList.map((r) => `- ${r.name} (id: ${r.id})`).join('\n')

  return `You are an AI assistant that determines attendance at a standup meeting.

STANDUP DATE: ${standupDate}

FULL TEAM (all members who SHOULD attend this project standup):
${resourceListStr}

TASK: Based on the parsed speaker segments provided, determine which team members attended.
- "attended" = the person spoke or was explicitly mentioned as present
- "absent" = not present in transcript AND no mention of planned leave
- "unknown" = cannot determine from transcript alone (leave for human review)

Note: Some members may be on planned leave — if transcript mentions leave for someone, mark them as attended=false but note it.

For each team member, output:
{
  "resourceId": "uuid",
  "resourceName": "name",
  "attended": boolean,
  "attendanceSource": "ai_inferred",
  "confidence": "high|medium|low",
  "note": "brief note if applicable e.g. 'on leave mentioned by team lead'"
}

Return results in the items array of the structured output schema.`
}
