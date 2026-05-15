<script setup lang="ts">
import type { Project, Resource, ProjectResource } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

const { data: projects } = await useFetch<Project[]>('/api/projects')
const { data: resources } = await useFetch<Resource[]>('/api/resources')
const { data: mappings, refresh } = await useFetch<ProjectResource[]>('/api/project-resources')
const toast = useToast()

const form = reactive({ projectId: '', resourceId: '', allocationPct: 100 })

async function create() {
  await $fetch('/api/project-resources', { method: 'POST', body: { ...form } })
  toast.add({ title: 'Mapping created', color: 'green' })
  refresh()
}

async function remove(id: string) {
  await $fetch(`/api/project-resources/${id}`, { method: 'DELETE' })
  toast.add({ title: 'Mapping removed', color: 'green' })
  refresh()
}

const projectName = (id: string) => (projects.value || []).find((p) => p.id === id)?.name || id
const resourceName = (id: string) => (resources.value || []).find((r) => r.id === id)?.name || id

const projectOptions = computed(() => (projects.value || []).map((p) => ({ label: p.name, value: p.id })))
const resourceOptions = computed(() => (resources.value || []).map((r) => ({ label: r.name, value: r.id })))
</script>

<template>
  <div class="p-4 md:p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Project–Resource Mappings</h1>

    <UCard class="mb-6">
      <h3 class="font-semibold mb-4">Add Mapping</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <USelect v-model="form.projectId" :options="projectOptions" placeholder="Project" />
        <USelect v-model="form.resourceId" :options="resourceOptions" placeholder="Resource" />
        <UInput v-model.number="form.allocationPct" type="number" min="1" max="100" placeholder="Allocation %" />
      </div>
      <UButton class="mt-4" @click="create" :disabled="!form.projectId || !form.resourceId">Add</UButton>
    </UCard>

    <UCard v-if="mappings?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="m in mappings" :key="m.id" class="flex items-center justify-between py-3">
          <div>
            <p class="font-medium text-gray-800">{{ projectName(m.projectId) }} → {{ resourceName(m.resourceId) }}</p>
            <p class="text-xs text-gray-500">{{ m.allocationPct }}% allocation</p>
          </div>
          <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" @click="remove(m.id)" />
        </li>
      </ul>
    </UCard>
  </div>
</template>
