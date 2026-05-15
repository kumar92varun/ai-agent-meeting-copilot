import { StateGraph, END, START } from '@langchain/langgraph'
import type {
  SpeakerSegment,
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

export interface StandupGraphState {
  // Inputs
  standupId?: string
  projectId: string
  projectName: string
  standupDate: string
  transcript: string
  resourceList: Array<{ id: string; name: string }>
  existingTasksByResource: Record<
    string,
    Array<{ id: string; title: string; description: string | null; status: string }>
  >

  // Node outputs
  speakerSegments: SpeakerSegment[]
  attendance: AttendanceItem[]
  extractedTasks: ExtractedTaskItem[]
  matchResults: MatchResultItem[]
  deadlineResolutions: DeadlineResolution[]
  hourEstimates: HourEstimate[]
  detectedRisks: ExtractedRisk[]

  // Progress tracking (for SSE streaming)
  completedNodes: string[]
  errors: Record<string, string>
}

const initialState: StandupGraphState = {
  projectId: '',
  projectName: '',
  standupDate: '',
  transcript: '',
  resourceList: [],
  existingTasksByResource: {},
  speakerSegments: [],
  attendance: [],
  extractedTasks: [],
  matchResults: [],
  deadlineResolutions: [],
  hourEstimates: [],
  detectedRisks: [],
  completedNodes: [],
  errors: {},
}

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
  const graph = new StateGraph<StandupGraphState>({
    channels: {
      standupId: { value: (_, v) => v, default: () => undefined },
      projectId: { value: (_, v) => v, default: () => '' },
      projectName: { value: (_, v) => v, default: () => '' },
      standupDate: { value: (_, v) => v, default: () => '' },
      transcript: { value: (_, v) => v, default: () => '' },
      resourceList: { value: (_, v) => v, default: () => [] },
      existingTasksByResource: { value: (_, v) => v, default: () => ({}) },
      speakerSegments: { value: (_, v) => v, default: () => [] },
      attendance: { value: (_, v) => v, default: () => [] },
      extractedTasks: { value: (_, v) => v, default: () => [] },
      matchResults: { value: (_, v) => v, default: () => [] },
      deadlineResolutions: { value: (_, v) => v, default: () => [] },
      hourEstimates: { value: (_, v) => v, default: () => [] },
      detectedRisks: { value: (_, v) => v, default: () => [] },
      completedNodes: { value: (_, v) => v, default: () => [] },
      errors: { value: (_, v) => v, default: () => ({}) },
    },
  })

  // @ts-ignore
  graph.addNode('parse-transcript', withProgress('parse-transcript', parseTranscriptNode))
  // @ts-ignore
  graph.addNode('infer-attendance', withProgress('infer-attendance', inferAttendanceNode))
  // @ts-ignore
  graph.addNode('extract-tasks', withProgress('extract-tasks', extractTasksNode))
  // @ts-ignore
  graph.addNode('match-existing-tasks', withProgress('match-existing-tasks', matchExistingTasksNode))
  // @ts-ignore
  graph.addNode('resolve-deadlines', withProgress('resolve-deadlines', resolveDeadlinesNode))
  // @ts-ignore
  graph.addNode('estimate-hours', withProgress('estimate-hours', estimateHoursNode))
  // @ts-ignore
  graph.addNode('detect-risks', withProgress('detect-risks', detectRisksNode))

  // @ts-ignore
  graph.addEdge(START, 'parse-transcript')
  // @ts-ignore
  graph.addEdge('parse-transcript', 'infer-attendance')
  // @ts-ignore
  graph.addEdge('infer-attendance', 'extract-tasks')
  // @ts-ignore
  graph.addEdge('extract-tasks', 'match-existing-tasks')
  // @ts-ignore
  graph.addEdge('match-existing-tasks', 'resolve-deadlines')
  // @ts-ignore
  graph.addEdge('resolve-deadlines', 'estimate-hours')
  // @ts-ignore
  graph.addEdge('estimate-hours', 'detect-risks')
  // @ts-ignore
  graph.addEdge('detect-risks', END)

  return graph.compile()
}

export { initialState }
