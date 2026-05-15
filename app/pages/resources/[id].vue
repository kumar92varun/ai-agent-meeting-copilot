<script setup lang="ts">
import type { Resource, Risk, DailyMetricsResource, Task, ProjectResourceTask } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })
const route = useRoute()
const resourceId = route.params.id as string

interface ResourceTaskRow {
  task: Task
  assignment: ProjectResourceTask
}

const { data: resource } = await useFetch<Resource>(`/api/resources/${resourceId}`)
const { data: tasks } = await useFetch<ResourceTaskRow[]>('/api/tasks', { query: { resourceId } })
const { data: resourceRisks } = await useFetch<Risk[]>('/api/risks', { query: { resourceId } })

const tabs = ['Performance', 'Tasks', 'Standups', 'Risks']
const selectedTab = ref(0)

const dateRange = reactive({ from: '', to: '' })
const { data: metrics } = await useFetch<DailyMetricsResource[]>('/api/metrics/resource-summary', {
  query: computed(() => ({ resourceId, ...dateRange })),
})

const refreshing = ref(false)
const toast = useToast()

async function refreshMetrics() {
  refreshing.value = true
  try {
    await $fetch(`/api/resources/${resourceId}/refresh-metrics`, { method: 'POST' })
    toast.add({ title: 'Refresh queued', color: 'green' })
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
          <NuxtLink to="/resources" class="hover:text-blue-600">Resources</NuxtLink>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
          <span>{{ resource?.name }}</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{{ resource?.name }}</h1>
        <p class="text-sm text-gray-500">{{ resource?.resourceType }}</p>
      </div>
      <UButton icon="i-heroicons-arrow-path" color="gray" variant="outline" size="sm" :loading="refreshing" @click="refreshMetrics">
        Refresh Metrics
      </UButton>
    </div>

    <UTabs :items="tabs.map(t => ({ label: t }))" v-model="selectedTab" class="mb-6" />

    <!-- Performance -->
    <div v-if="selectedTab === 0">
      <div v-if="metrics?.length" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <UCard v-for="m in metrics.slice(0, 1)" :key="m.id">
          <p class="text-sm text-gray-500">Attendance Rate</p>
          <p class="text-2xl font-bold text-blue-600">{{ (m.attendanceRate * 100).toFixed(0) }}%</p>
        </UCard>
        <UCard v-if="metrics[0]">
          <p class="text-sm text-gray-500">Tasks Committed</p>
          <p class="text-2xl font-bold text-gray-800">{{ metrics[0].tasksCommitted }}</p>
        </UCard>
        <UCard v-if="metrics[0]">
          <p class="text-sm text-gray-500">Completed On Time</p>
          <p class="text-2xl font-bold text-green-600">{{ metrics[0].tasksCompletedOnTime }}</p>
        </UCard>
        <UCard v-if="metrics[0]">
          <p class="text-sm text-gray-500">Tasks Slipped</p>
          <p class="text-2xl font-bold text-red-500">{{ metrics[0].tasksSlipped }}</p>
        </UCard>
      </div>
      <div v-else class="text-center py-12 text-gray-400">No metrics yet. Run a refresh to compute.</div>
    </div>

    <!-- Tasks -->
    <div v-else-if="selectedTab === 1">
      <UCard v-if="tasks?.length">
        <ul class="divide-y divide-gray-100">
          <li v-for="row in tasks" :key="row.task.id" class="py-3 flex items-center justify-between">
            <p class="font-medium text-gray-800">{{ row.task.title }}</p>
            <UBadge variant="subtle">{{ row.task.status }}</UBadge>
          </li>
        </ul>
      </UCard>
      <div v-else class="text-center py-12 text-gray-400">No tasks found.</div>
    </div>

    <!-- Standups placeholder -->
    <div v-else-if="selectedTab === 2">
      <div class="text-center py-12 text-gray-400">Standup history by resource coming soon.</div>
    </div>

    <!-- Risks -->
    <div v-else-if="selectedTab === 3">
      <UCard v-if="resourceRisks?.length">
        <ul class="divide-y divide-gray-100">
          <li v-for="risk in resourceRisks" :key="risk.id" class="py-3 flex items-start justify-between gap-2">
            <div>
              <p class="font-medium text-gray-800">{{ risk.title }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ risk.description }}</p>
            </div>
            <UBadge :color="risk.severity === 'critical' ? 'red' : risk.severity === 'high' ? 'orange' : 'yellow'" variant="subtle">
              {{ risk.severity }}
            </UBadge>
          </li>
        </ul>
      </UCard>
      <div v-else class="text-center py-12 text-gray-400">No risks detected.</div>
    </div>
  </div>
</template>
