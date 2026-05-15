<script setup lang="ts">
export interface AttendanceRow {
  resourceId: string
  resourceName: string
  attended: boolean
  attendanceSource: 'ai_inferred' | 'human_confirmed'
}

const props = defineProps<{ modelValue: AttendanceRow[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: AttendanceRow[]] }>()

function toggle(index: number) {
  const updated = props.modelValue.map((row, i) =>
    i === index
      ? { ...row, attended: !row.attended, attendanceSource: 'human_confirmed' as const }
      : row
  )
  emit('update:modelValue', updated)
}
</script>

<template>
  <UCard>
    <h3 class="font-semibold text-gray-800 mb-4">Attendance</h3>
    <p class="text-xs text-gray-500 mb-3">Toggle to correct AI inference. Source changes to "manual" on edit.</p>
    <ul class="space-y-2">
      <li
        v-for="(row, i) in modelValue"
        :key="row.resourceId"
        class="flex items-center justify-between py-1.5"
      >
        <div class="flex items-center gap-2">
          <UAvatar :alt="row.resourceName" size="xs" />
          <span class="text-sm text-gray-700">{{ row.resourceName }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :color="row.attendanceSource === 'human_confirmed' ? 'blue' : 'gray'"
            variant="subtle"
            class="text-xs"
          >
            {{ row.attendanceSource === 'human_confirmed' ? 'manual' : 'AI' }}
          </UBadge>
          <UToggle :model-value="row.attended" @update:model-value="toggle(i)" />
        </div>
      </li>
    </ul>
    <UiEmptyState
      v-if="!modelValue.length"
      title="No attendance data"
      icon="i-heroicons-users"
    />
  </UCard>
</template>
