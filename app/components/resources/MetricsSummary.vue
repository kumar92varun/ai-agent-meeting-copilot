<script setup lang="ts">
import type { DailyMetricsResource } from '../../../shared/types/domain'
import { formatPct } from '../../utils/format'

defineProps<{ metrics: DailyMetricsResource | null | undefined }>()
</script>

<template>
  <div v-if="metrics" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <UiStatCard
      label="Attendance Rate"
      :value="formatPct(metrics.attendanceRate)"
      color="blue"
      icon="i-heroicons-user-check"
    />
    <UiStatCard
      label="Tasks Committed"
      :value="metrics.tasksCommitted"
      icon="i-heroicons-clipboard-document-list"
    />
    <UiStatCard
      label="Completed On Time"
      :value="metrics.tasksCompletedOnTime"
      color="green"
      icon="i-heroicons-check-circle"
    />
    <UiStatCard
      label="Tasks Slipped"
      :value="metrics.tasksSlipped"
      :color="metrics.tasksSlipped > 0 ? 'red' : 'green'"
      icon="i-heroicons-clock"
    />
  </div>
  <UiEmptyState
    v-else
    icon="i-heroicons-chart-bar"
    title="No metrics yet"
    description="Run a refresh or ingest a standup to generate metrics."
  />
</template>
