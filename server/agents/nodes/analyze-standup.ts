import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { getChatModel, getLlmMeta } from '../../llm'
import { buildAnalyzeStandupPrompt, extractFathomActionItems } from '../prompts/analyze-standup.prompt'
import { StandupAnalysisSchema } from '../schemas'
import { invokeSingleStructured } from '../../llm/logging'
import type { StandupGraphState } from '../standup-graph'
import { fromISTDate } from '../../utils/dates'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function analyzeStandupNode(state: StandupGraphState): Promise<Partial<StandupGraphState>> {
  const {
    projectId,
    projectName,
    standupDate,
    transcript,
    resourceList,
    knownClientMembers,
    existingTasksByResource,
    standupId,
  } = state

  const fathomActionItems = extractFathomActionItems(transcript)
  const weekday = WEEKDAYS[fromISTDate(standupDate).getDay()]

  const model = getChatModel()
  const { provider, model: modelId } = getLlmMeta()

  const analysis = await invokeSingleStructured(
    model,
    StandupAnalysisSchema,
    [
      new SystemMessage(
        buildAnalyzeStandupPrompt(
          projectName,
          projectId,
          standupDate,
          weekday,
          resourceList,
          knownClientMembers,
          existingTasksByResource,
        )
      ),
      new HumanMessage(
        [
          transcript,
          fathomActionItems.length
            ? `\nFathom ACTION ITEMs (supplementary — enrich existing tasks, do not duplicate):\n${fathomActionItems.map((a) => `- ${a}`).join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      ),
    ],
    { nodeName: 'analyze-standup', standupId, model: modelId, provider }
  )

  return { analysis }
}
