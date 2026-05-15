<script setup lang="ts">
import type { Standup } from '../../../shared/types/domain'
import { formatDate } from '../../utils/format'

defineProps<{ standups: Standup[] }>()
</script>

<template>
  <div>
    <UiEmptyState
      v-if="!standups.length"
      icon="i-heroicons-microphone"
      title="No standups yet"
      description="Paste a transcript to ingest the first standup."
      action-label="New Standup"
      action-to="/standups/new"
    />
    <ul v-else class="divide-y divide-gray-100">
      <li v-for="standup in standups" :key="standup.id">
        <NuxtLink
          :to="`/standups/${standup.id}`"
          class="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors"
        >
          <div>
            <p class="font-medium text-gray-800">{{ formatDate(standup.standupDate) }}</p>
            <p class="text-xs text-gray-400">{{ standup.llmModelUsed ?? 'Model unknown' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UiStatusBadge :status="standup.extractionStatus" />
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
