<script setup lang="ts">
import type { Project, DailyMetricsProject } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

interface DashboardData {
  kpis: {
    activeProjects: number
    openRisks: number
    standupsThisWeek: number
    resourcesAtRisk: number
  }
  projects: (Project & { metrics: DailyMetricsProject | null })[]
}

const { data, pending } = await useFetch<DashboardData>('/api/metrics/dashboard')

const healthColor = (score: number | null) => {
  if (!score) return 'gray'
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  return 'red'
}
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-sm text-gray-500 mt-1">All-project health overview</p>
    </div>

    <!-- KPI strip -->
    <div v-if="data" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <UCard>
        <div class="text-3xl font-bold text-blue-600">{{ data.kpis.activeProjects }}</div>
        <div class="text-sm text-gray-500 mt-1">Active Projects</div>
      </UCard>
      <UCard>
        <div class="text-3xl font-bold" :class="data.kpis.openRisks > 0 ? 'text-red-600' : 'text-green-600'">
          {{ data.kpis.openRisks }}
        </div>
        <div class="text-sm text-gray-500 mt-1">Open Risks</div>
      </UCard>
      <UCard>
        <div class="text-3xl font-bold text-gray-800">{{ data.kpis.standupsThisWeek }}</div>
        <div class="text-sm text-gray-500 mt-1">Standups This Week</div>
      </UCard>
      <UCard>
        <div class="text-3xl font-bold text-orange-500">{{ data.kpis.resourcesAtRisk }}</div>
        <div class="text-sm text-gray-500 mt-1">Resources at Risk</div>
      </UCard>
    </div>

    <!-- Projects grid -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <USkeleton v-for="i in 6" :key="i" class="h-40 rounded-xl" />
    </div>

    <div v-else-if="data?.projects?.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <NuxtLink
        v-for="project in data.projects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="block"
      >
        <UCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-gray-900">{{ project.name }}</h3>
              <p class="text-xs text-gray-500">{{ project.clientName }}</p>
            </div>
            <UBadge
              v-if="project.metrics"
              :color="healthColor(project.metrics.healthScore)"
              variant="subtle"
            >
              {{ project.metrics.healthScore.toFixed(0) }}
            </UBadge>
            <UBadge v-else color="gray" variant="subtle">No data</UBadge>
          </div>
          <div v-if="project.metrics" class="grid grid-cols-3 gap-2 text-center">
            <div>
              <div class="text-lg font-bold text-red-500">{{ project.metrics.openRisksCount }}</div>
              <div class="text-xs text-gray-400">Risks</div>
            </div>
            <div>
              <div class="text-lg font-bold text-orange-500">{{ project.metrics.overdueTasksCount }}</div>
              <div class="text-xs text-gray-400">Overdue</div>
            </div>
            <div>
              <div class="text-lg font-bold text-green-600">{{ (project.metrics.attendanceRate * 100).toFixed(0) }}%</div>
              <div class="text-xs text-gray-400">Attendance</div>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-16 text-gray-400">
      <UIcon name="i-heroicons-briefcase" class="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p>No projects found.</p>
      <NuxtLink to="/admin/projects" class="text-sm text-blue-600 mt-1 inline-block">Add a project</NuxtLink>
    </div>
  </div>
</template>
