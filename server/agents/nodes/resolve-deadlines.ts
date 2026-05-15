import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildResolveDeadlinesPrompt } from '../prompts/resolve-deadlines.prompt'
import { DeadlineResolutionSchema } from '../schemas'
import { invokeWithLogging } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'
import { format } from 'date-fns'
import { fromISTDate } from '../../utils/dates'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function resolveDeadlinesNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const { extractedTasks, standupDate, standupId } = state

  const weekday = WEEKDAYS[fromISTDate(standupDate).getDay()]
  const systemPrompt = buildResolveDeadlinesPrompt(standupDate, weekday)

  const phrases = extractedTasks
    .filter((t) => t.deadlinePhrase)
    .map((t, i) => ({ index: i, phrase: t.deadlinePhrase, context: t.title }))

  if (!phrases.length) return { deadlineResolutions: [] }

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const response = await invokeWithLogging<{ content: string }>(
    model,
    [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Deadline phrases to resolve:\n${JSON.stringify(phrases, null, 2)}`),
    ],
    { nodeName: 'resolve-deadlines', standupId, model: modelId, provider }
  )

  const rawJson = (response as unknown as { content: string }).content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  const parsed = JSON.parse(rawJson)
  const deadlineResolutions = DeadlineResolutionSchema.array().parse(parsed)

  return { deadlineResolutions }
}
