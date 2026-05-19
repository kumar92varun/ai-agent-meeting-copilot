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

const kpiCards = computed(() => {
  if (!data.value) return []
  const { activeProjects, openRisks, standupsThisWeek, resourcesAtRisk } = data.value.kpis
  return [
    {
      label: 'Active Projects',
      value: activeProjects,
      icon: 'i-heroicons-briefcase',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      valueColor: 'text-slate-800',
    },
    {
      label: 'Open Risks',
      value: openRisks,
      icon: 'i-heroicons-exclamation-triangle',
      iconBg: openRisks > 0 ? 'bg-rose-50' : 'bg-emerald-50',
      iconColor: openRisks > 0 ? 'text-rose-500' : 'text-emerald-500',
      valueColor: openRisks > 0 ? 'text-rose-600' : 'text-emerald-600',
    },
    {
      label: 'Standups This Week',
      value: standupsThisWeek,
      icon: 'i-heroicons-microphone',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-500',
      valueColor: 'text-slate-800',
    },
    {
      label: 'Resources at Risk',
      value: resourcesAtRisk,
      icon: 'i-heroicons-user-minus',
      iconBg: resourcesAtRisk > 0 ? 'bg-amber-50' : 'bg-emerald-50',
      iconColor: resourcesAtRisk > 0 ? 'text-amber-500' : 'text-emerald-500',
      valueColor: resourcesAtRisk > 0 ? 'text-amber-600' : 'text-emerald-600',
    },
  ]
})
</script>

<template>
  <div class="p-6 md:p-8 max-w-screen-xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
      <p class="text-sm text-slate-400 mt-1">All-project health overview</p>
    </div>

    <!-- KPI strip -->
    <div v-if="data" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div
        v-for="kpi in kpiCards"
        :key="kpi.label"
        class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
      >
        <div class="flex items-start justify-between mb-3">
          <div :class="[kpi.iconBg, 'w-10 h-10 rounded-xl flex items-center justify-center']">
            <UIcon :name="kpi.icon" :class="[kpi.iconColor, 'w-5 h-5']" />
          </div>
        </div>
        <p :class="[kpi.valueColor, 'text-3xl font-bold tracking-tight']">{{ kpi.value }}</p>
        <p class="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">{{ kpi.label }}</p>
      </div>
    </div>

    <!-- Section label -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Projects</h2>
      <NuxtLink to="/projects" class="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
        View all →
      </NuxtLink>
    </div>

    <!-- Projects grid -->
    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <USkeleton v-for="i in 6" :key="i" class="h-40 rounded-2xl" />
    </div>

    <div v-else-if="data?.projects?.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <NuxtLink
        v-for="project in data.projects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="block group"
      >
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full hover:shadow-md hover:border-indigo-100 transition-all duration-200">
          <!-- Project name + health -->
          <div class="flex items-start justify-between mb-4">
            <div class="min-w-0 flex-1 mr-3">
              <h3 class="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                {{ project.name }}
              </h3>
            </div>
            <UBadge
              v-if="project.metrics"
              :color="healthColor(project.metrics.healthScore)"
              variant="subtle"
              class="font-semibold flex-shrink-0"
            >
              {{ project.metrics.healthScore.toFixed(0) }}
            </UBadge>
            <UBadge v-else color="gray" variant="subtle" class="flex-shrink-0">No data</UBadge>
          </div>

          <!-- Metrics row -->
          <div v-if="project.metrics" class="grid grid-cols-3 gap-2 border-t border-slate-50 pt-4">
            <div class="text-center">
              <p class="text-lg font-bold" :class="project.metrics.openRisksCount > 0 ? 'text-rose-500' : 'text-slate-300'">
                {{ project.metrics.openRisksCount }}
              </p>
              <p class="text-xs text-slate-400 mt-0.5">Risks</p>
            </div>
            <div class="text-center">
              <p class="text-lg font-bold" :class="project.metrics.overdueTasksCount > 0 ? 'text-amber-500' : 'text-slate-300'">
                {{ project.metrics.overdueTasksCount }}
              </p>
              <p class="text-xs text-slate-400 mt-0.5">Overdue</p>
            </div>
            <div class="text-center">
              <p class="text-lg font-bold text-emerald-500">
                {{ (project.metrics.attendanceRate * 100).toFixed(0) }}%
              </p>
              <p class="text-xs text-slate-400 mt-0.5">Attendance</p>
            </div>
          </div>
          <div v-else class="text-center text-xs text-slate-300 pt-4 border-t border-slate-50">
            No standup data yet
          </div>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="text-center py-20">
      <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-heroicons-briefcase" class="w-7 h-7 text-slate-300" />
      </div>
      <p class="text-slate-400 font-medium">No projects yet</p>
      <NuxtLink to="/admin/projects" class="text-sm text-indigo-600 mt-2 inline-block hover:text-indigo-800 font-medium">
        Add your first project →
      </NuxtLink>
    </div>
  </div>
</template>
