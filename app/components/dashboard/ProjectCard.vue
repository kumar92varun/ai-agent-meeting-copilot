<script setup lang="ts">
import type { Project, DailyMetricsProject } from '../../../shared/types/domain'
import { formatPct } from '../../utils/format'

defineProps<{
  project: Project & { metrics: DailyMetricsProject | null }
}>()
</script>

<template>
  <NuxtLink :to="`/projects/${project.id}`" class="block group">
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full hover:shadow-md hover:border-indigo-100 transition-all duration-200 cursor-pointer">
      <div class="flex items-start justify-between mb-4">
        <div class="min-w-0 flex-1 mr-3">
          <h3 class="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
            {{ project.name }}
          </h3>
        </div>
        <UiHealthBadge :score="project.metrics?.healthScore" />
      </div>

      <div v-if="project.metrics" class="grid grid-cols-3 gap-2 border-t border-slate-50 pt-4 text-center">
        <div>
          <p class="text-lg font-bold" :class="project.metrics.openRisksCount > 0 ? 'text-rose-500' : 'text-slate-300'">
            {{ project.metrics.openRisksCount }}
          </p>
          <p class="text-xs text-slate-400 mt-0.5">Risks</p>
        </div>
        <div>
          <p class="text-lg font-bold" :class="project.metrics.overdueTasksCount > 0 ? 'text-amber-500' : 'text-slate-300'">
            {{ project.metrics.overdueTasksCount }}
          </p>
          <p class="text-xs text-slate-400 mt-0.5">Overdue</p>
        </div>
        <div>
          <p class="text-lg font-bold text-emerald-500">
            {{ formatPct(project.metrics.attendanceRate) }}
          </p>
          <p class="text-xs text-slate-400 mt-0.5">Attendance</p>
        </div>
      </div>
      <div v-else class="text-center text-xs text-slate-300 pt-4 border-t border-slate-50">
        No standup data yet
      </div>
    </div>
  </NuxtLink>
</template>
