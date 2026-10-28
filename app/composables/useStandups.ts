import type { Standup } from '../../shared/types/domain'
import type { SaveStandupRequest, StandupStreamEvent } from '../../shared/types/api'

export function useStandups(projectId?: string) {
  const query = projectId ? { projectId } : {}
  const { data: standups, pending, refresh } = useFetch<Standup[]>('/api/standups', { query })
  return { standups, pending, refresh }
}

export function useStandup(id: string) {
  return useFetch<Standup & { updates: unknown[] }>(`/api/standups/${id}`)
}

export function useStandupAnalyzer() {
  const progressNodes = ref<string[]>([])
  const isAnalyzing = ref(false)
  const error = ref('')

  async function analyze(
    payload: { projectId: string; standupDate: string; transcript: string },
    onResult: (data: StandupStreamEvent['data']) => void
  ) {
    isAnalyzing.value = true
    progressNodes.value = []
    error.value = ''

    try {
      const response = await fetch(appUrl('/api/standups/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)

        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const event: StandupStreamEvent = JSON.parse(line.slice(6))
            if (event.type === 'progress' && event.node) {
              progressNodes.value = [...progressNodes.value, event.node]
            } else if (event.type === 'result' && event.data) {
              onResult(event.data)
            } else if (event.type === 'error') {
              error.value = event.error || 'Analysis failed'
            }
          } catch {}
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Network error'
    } finally {
      isAnalyzing.value = false
    }
  }

  async function save(body: SaveStandupRequest): Promise<string> {
    const { id } = await $fetch<{ id: string }>('/api/standups', { method: 'POST', body })
    return id
  }

  return { progressNodes, isAnalyzing, error, analyze, save }
}
