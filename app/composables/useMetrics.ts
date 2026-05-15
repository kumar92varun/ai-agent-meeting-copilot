import type { DailyMetricsProject, DailyMetricsResource } from '../../shared/types/domain'

export function useProjectMetrics(projectId: string, from?: string, to?: string) {
  const query = computed(() => ({ projectId, from, to }))
  return useFetch<DailyMetricsProject[]>('/api/metrics/project-summary', {
    query,
    watch: [query],
  })
}

export function useResourceMetrics(resourceId: string, from?: string, to?: string) {
  const query = computed(() => ({ resourceId, from, to }))
  return useFetch<DailyMetricsResource[]>('/api/metrics/resource-summary', {
    query,
    watch: [query],
  })
}

export function useDashboard() {
  return useFetch('/api/metrics/dashboard')
}

export function useJobPoller(jobId: MaybeRef<string | null>, intervalMs = 2000) {
  const done = ref(false)
  const state = ref<string>('')
  let timer: ReturnType<typeof setInterval> | null = null

  async function poll() {
    const id = isRef(jobId) ? jobId.value : jobId
    if (!id || done.value) return
    try {
      const job = await $fetch<{ state: string; result?: unknown; error?: string }>(
        `/api/jobs/${id}`
      )
      state.value = job.state
      if (job.state === 'completed' || job.state === 'failed') {
        done.value = true
        if (timer) clearInterval(timer)
      }
    } catch {}
  }

  function start() {
    done.value = false
    poll()
    timer = setInterval(poll, intervalMs)
  }

  function stop() {
    if (timer) clearInterval(timer)
  }

  onUnmounted(stop)

  return { state, done, start, stop }
}
