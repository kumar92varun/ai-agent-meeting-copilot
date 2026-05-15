<script setup lang="ts">
import type { Project, DailyMetricsProject } from '../../../shared/types/domain'
import { formatPct } from '../../utils/format'

defineProps<{
  project: Project & { metrics: DailyMetricsProject | null }
}>()
</script>

<template>
  <NuxtLink :to="`/projects/${project.id}`" class="block group">
    <UCard class="hover:shadow-md transition-shadow cursor-pointer h-full group-hover:border-blue-200">
      <div class="flex items-start justify-between mb-3">
        <div class="min-w-0 flex-1 mr-2">
          <h3 class="font-semibold text-gray-900 truncate">{{ project.name }}</h3>
        </div>
        <UiHealthBadge :score="project.metrics?.healthScore" />
      </div>

      <div v-if="project.metrics" class="grid grid-cols-3 gap-2 text-center border-t border-gray-100 pt-3">
        <div>
          <p class="text-xl font-bold" :class="project.metrics.openRisksCount > 0 ? 'text-red-500' : 'text-gray-400'">
            {{ project.metrics.openRisksCount }}
          </p>
          <p class="text-xs text-gray-400">Risks</p>
        </div>
        <div>
          <p class="text-xl font-bold" :class="project.metrics.overdueTasksCount > 0 ? 'text-orange-500' : 'text-gray-400'">
            {{ project.metrics.overdueTasksCount }}
          </p>
          <p class="text-xs text-gray-400">Overdue</p>
        </div>
        <div>
          <p class="text-xl font-bold text-green-600">
            {{ formatPct(project.metrics.attendanceRate) }}
          </p>
          <p class="text-xs text-gray-400">Attendance</p>
        </div>
      </div>
      <div v-else class="text-center text-xs text-gray-400 pt-3 border-t border-gray-100">
        No metrics yet — ingest a standup to generate
      </div>
    </UCard>
  </NuxtLink>
</template>
