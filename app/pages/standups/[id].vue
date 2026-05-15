<script setup lang="ts">
import type { Standup, StandupUpdate } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

interface StandupDetail extends Standup {
  updates: StandupUpdate[]
}

const route = useRoute()
const { data: standup } = await useFetch<StandupDetail>(`/api/standups/${route.params.id}`)
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto">
    <div class="flex items-center gap-2 text-sm text-gray-500 mb-4">
      <NuxtLink :to="`/projects/${standup?.projectId}`" class="hover:text-blue-600">Project</NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
      <span>Standup {{ standup?.standupDate }}</span>
    </div>

    <h1 class="text-2xl font-bold text-gray-900 mb-1">Standup — {{ standup?.standupDate }}</h1>
    <p class="text-sm text-gray-500 mb-6">Model: {{ standup?.llmModelUsed }} · {{ standup?.processingDurationMs }}ms</p>

    <UCard class="mb-6">
      <h2 class="font-semibold text-gray-800 mb-3">Raw Transcript</h2>
      <pre class="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded p-4 max-h-64 overflow-auto">{{ standup?.rawTranscript }}</pre>
    </UCard>

    <UCard v-if="standup?.updates?.length">
      <h2 class="font-semibold text-gray-800 mb-4">Attendance</h2>
      <ul class="space-y-2">
        <li v-for="update in standup.updates" :key="update.id" class="flex items-center justify-between text-sm">
          <span class="text-gray-700">Resource: {{ update.resourceId }}</span>
          <UBadge :color="update.attended ? 'green' : 'red'" variant="subtle">
            {{ update.attended ? 'Present' : 'Absent' }}
          </UBadge>
        </li>
      </ul>
    </UCard>
  </div>
</template>
