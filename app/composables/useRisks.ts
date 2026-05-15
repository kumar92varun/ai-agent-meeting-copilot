import type { Risk } from '../../shared/types/domain'
import type { RiskStatus } from '../../shared/constants/risk-categories'

export interface RisksFilter {
  projectId?: string
  resourceId?: string
  status?: RiskStatus | ''
  severity?: string
}

export function useRisks(filter?: MaybeRef<RisksFilter>) {
  const query = computed(() => {
    const f = isRef(filter) ? filter.value : filter
    return Object.fromEntries(Object.entries(f ?? {}).filter(([, v]) => v))
  })

  const { data: risks, pending, refresh } = useFetch<Risk[]>('/api/risks', {
    query,
    watch: [query],
  })

  async function updateRisk(id: string, body: { status: RiskStatus; resolutionNotes?: string }) {
    const result = await $fetch<Risk>(`/api/risks/${id}`, { method: 'PATCH', body })
    await refresh()
    return result
  }

  const openCount = computed(() => risks.value?.filter((r) => r.status === 'open').length ?? 0)

  return { risks, pending, openCount, refresh, updateRisk }
}
