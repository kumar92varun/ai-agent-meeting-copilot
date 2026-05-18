import { StateGraph, START, END, Annotation } from '@langchain/langgraph'
import type {
  SpeakerSegment,
  ClientTeamMemberItem,
  AttendanceItem,
  ExtractedTaskItem,
  MatchResultItem,
  DeadlineResolution,
  HourEstimate,
  ExtractedRisk,
} from './schemas'
import { parseTranscriptNode } from './nodes/parse-transcript'
import { inferAttendanceNode } from './nodes/infer-attendance'
import { extractTasksNode } from './nodes/extract-tasks'
import { matchExistingTasksNode } from './nodes/match-existing-tasks'
import { resolveDeadlinesNode } from './nodes/resolve-deadlines'
import { estimateHoursNode } from './nodes/estimate-hours'
import { detectRisksNode } from './nodes/detect-risks'

const StandupAnnotation = Annotation.Root({
  // Inputs
  standupId: Annotation<string | undefined>({ reducer: (_, v) => v, default: () => undefined }),
  projectId: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  projectName: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  standupDate: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  transcript: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  resourceList: Annotation<Array<{ id: string; name: string }>>({
    reducer: (_, v) => v,
    default: () => [],
  }),
  knownClientMembers: Annotation<Array<{ id: string; name: string; inferredRole: string | null }>>({
    reducer: (_, v) => v,
    default: () => [],
  }),
  existingTasksByResource: Annotation<
    Record<string, Array<{ id: string; title: string; description: string | null; status: string }>>
  >({ reducer: (_, v) => v, default: () => ({}) }),

  // Node outputs
  speakerSegments: Annotation<SpeakerSegment[]>({ reducer: (_, v) => v, default: () => [] }),
  identifiedClientMembers: Annotation<ClientTeamMemberItem[]>({ reducer: (_, v) => v, default: () => [] }),
  fathomActionItems: Annotation<string[]>({ reducer: (_, v) => v, default: () => [] }),
  attendance: Annotation<AttendanceItem[]>({ reducer: (_, v) => v, default: () => [] }),
  extractedTasks: Annotation<ExtractedTaskItem[]>({ reducer: (_, v) => v, default: () => [] }),
  matchResults: Annotation<MatchResultItem[]>({ reducer: (_, v) => v, default: () => [] }),
  deadlineResolutions: Annotation<DeadlineResolution[]>({ reducer: (_, v) => v, default: () => [] }),
  hourEstimates: Annotation<HourEstimate[]>({ reducer: (_, v) => v, default: () => [] }),
  detectedRisks: Annotation<ExtractedRisk[]>({ reducer: (_, v) => v, default: () => [] }),

  // Progress tracking (for SSE streaming)
  completedNodes: Annotation<string[]>({ reducer: (_, v) => v, default: () => [] }),
  errors: Annotation<Record<string, string>>({ reducer: (_, v) => v, default: () => ({}) }),
})

export type StandupGraphState = typeof StandupAnnotation.State

function withProgress(
  nodeName: string,
  fn: (state: StandupGraphState) => Promise<Partial<StandupGraphState>>
) {
  return async (state: StandupGraphState): Promise<Partial<StandupGraphState>> => {
    try {
      const result = await fn(state)
      return {
        ...result,
        completedNodes: [...state.completedNodes, nodeName],
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        completedNodes: [...state.completedNodes, nodeName],
        errors: { ...state.errors, [nodeName]: errMsg },
      }
    }
  }
}

export function buildStandupGraph() {
  return new StateGraph(StandupAnnotation)
    .addNode('parse-transcript', withProgress('parse-transcript', parseTranscriptNode))
    .addNode('infer-attendance', withProgress('infer-attendance', inferAttendanceNode))
    .addNode('extract-tasks', withProgress('extract-tasks', extractTasksNode))
    .addNode('match-existing-tasks', withProgress('match-existing-tasks', matchExistingTasksNode))
    .addNode('resolve-deadlines', withProgress('resolve-deadlines', resolveDeadlinesNode))
    .addNode('estimate-hours', withProgress('estimate-hours', estimateHoursNode))
    .addNode('detect-risks', withProgress('detect-risks', detectRisksNode))
    .addEdge(START, 'parse-transcript')
    .addEdge('parse-transcript', 'infer-attendance')
    .addEdge('infer-attendance', 'extract-tasks')
    .addEdge('extract-tasks', 'match-existing-tasks')
    .addEdge('match-existing-tasks', 'resolve-deadlines')
    .addEdge('resolve-deadlines', 'estimate-hours')
    .addEdge('estimate-hours', 'detect-risks')
    .addEdge('detect-risks', END)
    .compile()
}
