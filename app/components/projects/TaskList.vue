<script setup lang="ts">
import type { Task } from '../../../shared/types/domain'

const props = defineProps<{ tasks: Task[] }>()
const toast = useToast()

async function updateStatus(taskId: string, status: string) {
  await $fetch(`/api/tasks/${taskId}`, { method: 'PATCH', body: { status } })
  toast.add({ title: 'Task updated', color: 'green' })
}

const statusOptions = ['committed', 'in_progress', 'completed', 'overdue', 'carried_over', 'cancelled']
</script>

<template>
  <div>
    <UiEmptyState
      v-if="!tasks.length"
      icon="i-heroicons-clipboard-document-list"
      title="No tasks yet"
      description="Tasks appear here after a standup is ingested."
    />
    <ul v-else class="divide-y divide-gray-100">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="flex items-center justify-between py-3 gap-2"
      >
        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-800 truncate">{{ task.title }}</p>
          <p v-if="task.description" class="text-xs text-gray-500 truncate">{{ task.description }}</p>
        </div>
        <UiStatusBadge :status="task.status" />
      </li>
    </ul>
  </div>
</template>
