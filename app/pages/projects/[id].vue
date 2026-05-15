<script setup lang="ts">
import type { Project, Task, Risk, Standup, ProjectResource } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })
const route = useRoute()
const projectId = route.params.id as string

const { data: project } = await useFetch<Project>(`/api/projects/${projectId}`)
const { data: tasks } = await useFetch<Task[]>('/api/tasks', { query: { projectId } })
const { data: projectRisks } = await useFetch<Risk[]>('/api/risks', { query: { projectId } })
const { data: standups } = await useFetch<Standup[]>('/api/standups', { query: { projectId } })
const { data: resources } = await useFetch<ProjectResource[]>('/api/project-resources', { query: { projectId } })

const tabs = ['Overview', 'Tasks', 'Standups', 'Resources', 'Risks']
const selectedTab = ref(0)

const refreshing = ref(false)
const toast = useToast()

async function refreshMetrics() {
  refreshing.value = true
  try {
    const { jobId } = await $fetch<{ jobId: string }>(`/api/projects/${projectId}/refresh-metrics`, { method: 'POST' })
    toast.add({ title: 'Metrics refresh queued', icon: 'i-heroicons-check-circle', color: 'green' })
  } catch {
    toast.add({ title: 'Failed to queue refresh', color: 'red' })
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <NuxtLink to="/projects" class="hover:text-blue-600">Projects</NuxtLink>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
          <span>{{ project?.name }}</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{{ project?.name }}</h1>
        <p class="text-sm text-gray-500">{{ project?.clientName }}</p>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-arrow-path"
          color="gray"
          variant="outline"
          :loading="refreshing"
          size="sm"
          @click="refreshMetrics"
        >
          Refresh Metrics
        </UButton>
        <UButton icon="i-heroicons-plus" size="sm" :to="`/standups/new?projectId=${projectId}`">
          New Standup
        </UButton>
      </div>
    </div>

    <UTabs :items="tabs.map(t => ({ label: t }))" v-model="selectedTab" class="mb-6" />

    <!-- Overview -->
    <div v-if="selectedTab === 0">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard>
          <p class="text-sm text-gray-500 mb-1">Open Risks</p>
          <p class="text-3xl font-bold text-red-500">{{ projectRisks?.filter(r => r.status === 'open').length ?? 0 }}</p>
        </UCard>
        <UCard>
          <p class="text-sm text-gray-500 mb-1">Overdue Tasks</p>
          <p class="text-3xl font-bold text-orange-500">{{ tasks?.filter(t => t.status === 'overdue').length ?? 0 }}</p>
        </UCard>
        <UCard>
          <p class="text-sm text-gray-500 mb-1">Standups Ingested</p>
          <p class="text-3xl font-bold text-blue-600">{{ standups?.length ?? 0 }}</p>
        </UCard>
      </div>
    </div>

    <!-- Tasks -->
    <div v-else-if="selectedTab === 1">
      <UCard v-if="tasks?.length">
        <ul class="divide-y divide-gray-100">
          <li v-for="task in tasks" :key="task.id" class="py-3 flex items-center justify-between">
            <div>
              <p class="font-medium text-gray-800">{{ task.title }}</p>
              <p class="text-xs text-gray-500">{{ task.description }}</p>
            </div>
            <UBadge :color="task.status === 'completed' ? 'green' : task.status === 'overdue' ? 'red' : 'blue'" variant="subtle">
              {{ task.status }}
            </UBadge>
          </li>
        </ul>
      </UCard>
      <div v-else class="text-center py-12 text-gray-400">No tasks yet.</div>
    </div>

    <!-- Standups -->
    <div v-else-if="selectedTab === 2">
      <UCard v-if="standups?.length">
        <ul class="divide-y divide-gray-100">
          <li v-for="standup in standups" :key="standup.id">
            <NuxtLink :to="`/standups/${standup.id}`" class="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-1 transition-colors">
              <span class="font-medium text-gray-800">{{ standup.standupDate }}</span>
              <div class="flex items-center gap-2">
                <UBadge color="green" variant="subtle">{{ standup.extractionStatus }}</UBadge>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
              </div>
            </NuxtLink>
          </li>
        </ul>
      </UCard>
      <div v-else class="text-center py-12 text-gray-400">No standups yet.</div>
    </div>

    <!-- Resources -->
    <div v-else-if="selectedTab === 3">
      <UCard v-if="resources?.length">
        <ul class="divide-y divide-gray-100">
          <li v-for="mapping in resources" :key="mapping.id" class="py-3">
            <p class="font-medium text-gray-800">Resource ID: {{ mapping.resourceId }}</p>
            <p class="text-xs text-gray-500">{{ mapping.allocationPct }}% allocation</p>
          </li>
        </ul>
      </UCard>
      <div v-else class="text-center py-12 text-gray-400">No resources mapped.</div>
    </div>

    <!-- Risks -->
    <div v-else-if="selectedTab === 4">
      <UCard v-if="projectRisks?.length">
        <ul class="divide-y divide-gray-100">
          <li v-for="risk in projectRisks" :key="risk.id" class="py-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="font-medium text-gray-800">{{ risk.title }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ risk.description }}</p>
              </div>
              <UBadge :color="risk.severity === 'critical' ? 'red' : risk.severity === 'high' ? 'orange' : risk.severity === 'medium' ? 'yellow' : 'blue'" variant="subtle">
                {{ risk.severity }}
              </UBadge>
            </div>
          </li>
        </ul>
      </UCard>
      <div v-else class="text-center py-12 text-gray-400">No risks detected.</div>
    </div>
  </div>
</template>
