import { StateGraph, START, END, Annotation } from '@langchain/langgraph'
import type { StandupAnalysis } from './schemas'
import { analyzeStandupNode } from './nodes/analyze-standup'

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

  // Single node output
  analysis: Annotation<StandupAnalysis | null>({ reducer: (_, v) => v, default: () => null }),

  // Progress + error tracking (for SSE streaming)
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
    .addNode('analyze-standup', withProgress('analyze-standup', analyzeStandupNode))
    .addEdge(START, 'analyze-standup')
    .addEdge('analyze-standup', END)
    .compile()
}
