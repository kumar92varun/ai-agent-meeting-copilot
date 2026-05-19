import { StateGraph, START, END, Annotation } from '@langchain/langgraph'
import type { StandupAnalysis } from './schemas'
import { analyzeStandupNode } from './nodes/analyze-standup'

const StandupAnnotation = Annotation.Root({
  // ── Inputs ───────────────────────────────────────────────────────
  standupId: Annotation<string | undefined>({ reducer: (_, v) => v, default: () => undefined }),
  projectId: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  projectName: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  standupDate: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  transcript: Annotation<string>({ reducer: (_, v) => v, default: () => '' }),
  resourceList: Annotation<Array<{ id: string; name: string; resourceType: string }>>({
    reducer: (_, v) => v,
    default: () => [],
  }),
  knownClientMembers: Annotation<Array<{ id: string; name: string; inferredRole: string | null }>>({
    reducer: (_, v) => v,
    default: () => [],
  }),
  // Last 100 tasks for this project (all statuses) — used for matching
  recentProjectTasks: Annotation<Array<{
    id: string
    title: string
    description: string | null
    status: string
    assigneeNames: string[]
    lastMentionedAt: string | null
    timesSlipped: number
  }>>({
    reducer: (_, v) => v,
    default: () => [],
  }),

  // ── Single node output ───────────────────────────────────────────
  analysis: Annotation<StandupAnalysis | null>({ reducer: (_, v) => v, default: () => null }),

  // ── Progress + error tracking (SSE) ─────────────────────────────
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
      return { ...result, completedNodes: [...state.completedNodes, nodeName] }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[standup-graph] node "${nodeName}" failed:`, err)
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
