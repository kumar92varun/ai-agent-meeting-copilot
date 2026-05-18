<script setup lang="ts">
import type { IdentifiedClientMember } from '#shared/types/api'

defineProps<{ members: IdentifiedClientMember[] }>()
</script>

<template>
  <UCard>
    <div class="flex items-center gap-2 mb-4">
      <h3 class="font-semibold text-gray-800">Client Team Members</h3>
      <UBadge v-if="members.length" color="blue" variant="subtle">{{ members.length }} new</UBadge>
    </div>

    <UiEmptyState
      v-if="!members.length"
      icon="i-heroicons-building-office"
      title="No new client members identified"
      description="All speakers were matched to known team members."
    />

    <ul v-else class="space-y-2">
      <li
        v-for="member in members"
        :key="member.name"
        class="flex items-center justify-between py-2 px-3 rounded-lg bg-blue-50 border border-blue-100"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user-circle" class="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span class="text-sm font-medium text-gray-800">{{ member.name }}</span>
          <span v-if="member.inferredRole" class="text-xs text-gray-500">· {{ member.inferredRole }}</span>
        </div>
        <UBadge color="blue" variant="outline" class="text-xs">Will be saved</UBadge>
      </li>
    </ul>
  </UCard>
</template>
