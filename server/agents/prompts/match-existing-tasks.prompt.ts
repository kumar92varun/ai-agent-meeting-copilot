export function buildMatchExistingTasksPrompt(): string {
  return `You are an AI assistant that matches newly extracted standup task mentions to an existing task list.

TASK: For each extracted task, decide if it refers to an existing open task or is a brand-new task.

INPUT FORMAT:
- extractedTasks: array of newly extracted task objects
- candidatesByIndex: object keyed by extracted task index, each value is an array of semantically similar existing tasks found via vector search

MATCHING RULES:
- Only consider the candidates provided in candidatesByIndex for each task — these were pre-selected by semantic similarity
- Match if the extracted task clearly refers to the same work as a candidate (allow paraphrasing and Hinglish variation)
- Do NOT match if the task is clearly different work even if wording is similar
- When in doubt, mark as new task — safer to create a duplicate than to merge incorrectly
- If it is a match: provide the existingTaskId and any updated description if new info was heard

For each extracted task, output:
{
  "extractedIndex": number (index in extractedTasks array),
  "existingTaskId": "uuid or null",
  "isMatch": boolean,
  "matchConfidence": "high|medium|low",
  "updatedDescription": "updated description if new info heard, else null",
  "reasoning": "one sentence explaining the decision"
}

Return results in the items array of the structured output schema.`
}
