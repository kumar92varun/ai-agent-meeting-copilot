import type { Resource } from '../../shared/types/domain'

export function useResources() {
  const { data: resources, pending, refresh, error } = useFetch<Resource[]>('/api/resources')

  async function createResource(body: Partial<Resource>) {
    const result = await $fetch<Resource>('/api/resources', { method: 'POST', body })
    await refresh()
    return result
  }

  async function updateResource(id: string, body: Partial<Resource>) {
    const result = await $fetch<Resource>(`/api/resources/${id}`, { method: 'PATCH', body })
    await refresh()
    return result
  }

  async function deleteResource(id: string) {
    await $fetch(`/api/resources/${id}`, { method: 'DELETE' })
    await refresh()
  }

  async function refreshMetrics(id: string): Promise<string> {
    const { jobId } = await $fetch<{ jobId: string }>(
      `/api/resources/${id}/refresh-metrics`,
      { method: 'POST' }
    )
    return jobId
  }

  return { resources, pending, error, createResource, updateResource, deleteResource, refreshMetrics }
}

export function useResource(id: string) {
  return useFetch<Resource>(`/api/resources/${id}`)
}
