<script setup lang="ts">
import type { Project } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })
const { data: projects, pending } = await useFetch<Project[]>('/api/projects')
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Projects</h1>
    </div>

    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" />
    </div>

    <UCard v-else-if="projects?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="project in projects" :key="project.id">
          <NuxtLink :to="`/projects/${project.id}`" class="flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors">
            <div>
              <p class="font-medium text-gray-900">{{ project.name }}</p>
              <p class="text-xs text-gray-500">{{ project.clientName }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="project.status === 'active' ? 'green' : project.status === 'paused' ? 'yellow' : 'gray'" variant="subtle">
                {{ project.status }}
              </UBadge>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
            </div>
          </NuxtLink>
        </li>
      </ul>
    </UCard>

    <div v-else class="text-center py-16 text-gray-400">
      <p>No projects yet. Ask an admin to create one.</p>
    </div>
  </div>
</template>
