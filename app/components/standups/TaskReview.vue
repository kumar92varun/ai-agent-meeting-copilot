<script setup lang="ts">
import type { ExtractedTask } from '#shared/types/api'

const props = defineProps<{ modelValue: ExtractedTask[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: ExtractedTask[]] }>()

const ASSIGNMENT_TYPE_COLOR: Record<string, 'red' | 'gray' | 'blue'> = {
  assigned_by: 'red',
  mentioned_by: 'gray',
  reviewing: 'blue',
}

const ASSIGNMENT_TYPE_LABEL: Record<string, string> = {
  assigned_by: 'assigned by',
  mentioned_by: 'mentioned by',
  reviewing: 'reviewing',
}

function updateTitle(index: number, value: string) {
  const updated = props.modelValue.map((task, i) =>
    i === index ? { ...task, title: value } : task
  )
  emit('update:modelValue', updated)
}
</script>

<template>
  <UCard>
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-gray-800">
        Tasks <span class="text-gray-400 font-normal">({{ modelValue.length }})</span>
      </h3>
    </div>

    <UiEmptyState
      v-if="!modelValue.length"
      title="No tasks extracted"
      icon="i-heroicons-clipboard-document-list"
    />

    <div v-else class="space-y-4">
      <div
        v-for="(task, i) in modelValue"
        :key="i"
        class="border rounded-lg p-4 space-y-3"
        :class="
          task.isCompleted
            ? 'border-green-200 bg-green-50'
            : task.commitmentConfidence === 'vague'
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-gray-200'
        "
      >
        <!-- Title row -->
        <div class="flex items-start gap-2">
          <UInput
            :model-value="task.title"
            size="sm"
            class="flex-1"
            placeholder="Task title"
            @update:model-value="updateTitle(i, $event)"
          />
          <div class="flex gap-1 flex-shrink-0">
            <UBadge v-if="task.isCompleted" color="green" variant="subtle" class="text-xs">done</UBadge>
            <UBadge v-if="task.isCarriedOver" color="orange" variant="subtle" class="text-xs">carry-over</UBadge>
            <UBadge v-if="task.existingTaskId" color="purple" variant="subtle" class="text-xs">matched</UBadge>
            <UBadge
              :color="
                task.commitmentConfidence === 'firm'
                  ? 'green'
                  : task.commitmentConfidence === 'vague'
                    ? 'yellow'
                    : 'orange'
              "
              variant="subtle"
              class="text-xs"
            >
              {{ task.commitmentConfidence }}
            </UBadge>
          </div>
        </div>

        <!-- Deadline + hours meta -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">
          <div v-if="task.originalDeadlinePhrase">
            <span class="text-gray-400">Said:</span>
            <span class="ml-1 font-mono">"{{ task.originalDeadlinePhrase }}"</span>
          </div>
          <div v-if="task.resolvedDeadlineDate">
            <span class="text-gray-400">Due:</span>
            <span class="ml-1 font-medium text-gray-700">{{ task.resolvedDeadlineDate }}</span>
          </div>
          <div v-if="task.resourceEstimatedHours">
            <span class="text-gray-400">Dev est:</span>
            <span class="ml-1 font-medium text-gray-700">{{ task.resourceEstimatedHours }}h</span>
          </div>
          <div v-if="task.aiEstimatedHoursMin">
            <span class="text-gray-400">AI est:</span>
            <span class="ml-1 font-medium text-gray-700">
              {{ task.aiEstimatedHoursMin }}–{{ task.aiEstimatedHoursMax }}h
              <span class="text-gray-400">({{ task.aiEstimateConfidence }})</span>
            </span>
          </div>
        </div>

        <!-- Client member links -->
        <div v-if="task.clientMemberLinks?.length" class="flex flex-wrap gap-1.5">
          <div
            v-for="link in task.clientMemberLinks"
            :key="link.clientMemberName + link.assignmentType"
            class="flex items-center gap-1"
          >
            <UIcon name="i-heroicons-building-office" class="w-3 h-3 text-gray-400" />
            <span class="text-xs text-gray-500">{{ ASSIGNMENT_TYPE_LABEL[link.assignmentType] }}</span>
            <UBadge :color="ASSIGNMENT_TYPE_COLOR[link.assignmentType]" variant="subtle" class="text-xs">
              {{ link.clientMemberName }}
            </UBadge>
          </div>
        </div>

        <!-- Raw quote -->
        <blockquote
          v-if="task.rawQuote"
          class="text-xs text-gray-500 border-l-2 border-gray-300 pl-2 italic"
        >
          "{{ task.rawQuote }}"
        </blockquote>
      </div>
    </div>
  </UCard>
</template>
