<script setup lang="ts">
import type { Resource } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })
const { data: resources, pending } = await useFetch<Resource[]>('/api/resources')
</script>

<template>
  <div class="p-4 md:p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Resources</h1>

    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 5" :key="i" class="h-14 rounded-xl" />
    </div>

    <UCard v-else-if="resources?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="resource in resources" :key="resource.id">
          <NuxtLink :to="`/resources/${resource.id}`" class="flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors">
            <div class="flex items-center gap-3">
              <UAvatar :alt="resource.name" size="sm" />
              <div>
                <p class="font-medium text-gray-900">{{ resource.name }}</p>
                <p class="text-xs text-gray-500">{{ resource.roleTitle }} · {{ resource.resourceType }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="resource.isActive ? 'green' : 'gray'" variant="subtle">
                {{ resource.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
            </div>
          </NuxtLink>
        </li>
      </ul>
    </UCard>

    <div v-else class="text-center py-16 text-gray-400">No resources found.</div>
  </div>
</template>
