import type { Project } from '../../shared/types/domain'

export function useProjects() {
  const { data: projects, pending, refresh, error } = useFetch<Project[]>('/api/projects')

  async function createProject(body: Partial<Project>) {
    const result = await $fetch<Project>('/api/projects', { method: 'POST', body })
    await refresh()
    return result
  }

  async function updateProject(id: string, body: Partial<Project>) {
    const result = await $fetch<Project>(`/api/projects/${id}`, { method: 'PATCH', body })
    await refresh()
    return result
  }

  async function deleteProject(id: string) {
    await $fetch(`/api/projects/${id}`, { method: 'DELETE' })
    await refresh()
  }

  async function refreshMetrics(id: string): Promise<string> {
    const { jobId } = await $fetch<{ jobId: string }>(
      `/api/projects/${id}/refresh-metrics`,
      { method: 'POST' }
    )
    return jobId
  }

  return { projects, pending, error, createProject, updateProject, deleteProject, refreshMetrics }
}

export function useProject(id: string) {
  return useFetch<Project>(`/api/projects/${id}`)
}
