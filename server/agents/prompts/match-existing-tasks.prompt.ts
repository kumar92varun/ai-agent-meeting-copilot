export function buildMatchExistingTasksPrompt(): string {
  return `You are an AI assistant that matches newly extracted standup task mentions to an existing task list.

TASK: For each extracted task, decide if it refers to an existing open task or is a brand-new task.

MATCHING RULES:
- Match if the extracted task title/description clearly refers to the same work as an existing task
- Allow for paraphrasing and natural language variation (e.g. "API integration" matches "Integrate payment API")
- Do NOT match if the task is clearly different work even if wording is similar
- When in doubt, mark as new task (safer to create a duplicate than merge incorrectly)
- If it is a match: provide the existingTaskId and any updated description if new info was heard

You will receive:
1. extractedTasks: array of newly extracted task objects
2. existingTasks: array of open tasks for this resource with id, title, description, status

For each extracted task, output:
{
  "extractedIndex": number (index in extractedTasks array),
  "existingTaskId": "uuid or null",
  "isMatch": boolean,
  "matchConfidence": "high|medium|low",
  "updatedDescription": "updated description if new info heard, else null",
  "reasoning": "one sentence explaining the decision"
}

Return ONLY valid JSON array, no markdown.`
}
