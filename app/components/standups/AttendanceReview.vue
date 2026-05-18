<script setup lang="ts">
import type { AttendanceRow } from '#shared/types/api'

const props = defineProps<{ modelValue: AttendanceRow[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: AttendanceRow[]] }>()

function toggle(index: number) {
  const updated = props.modelValue.map((row, i) =>
    i === index ? { ...row, attended: !row.attended } : row
  )
  emit('update:modelValue', updated)
}
</script>

<template>
  <UCard>
    <h3 class="font-semibold text-gray-800 mb-4">Attendance</h3>
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
        <UToggle :model-value="row.attended" @update:model-value="toggle(i)" />
      </li>
    </ul>
    <UiEmptyState
      v-if="!modelValue.length"
      title="No attendance data"
      icon="i-heroicons-users"
    />
  </UCard>
</template>
