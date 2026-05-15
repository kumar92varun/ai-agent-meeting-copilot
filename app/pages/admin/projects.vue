<script setup lang="ts">
import type { Project } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })
const { data: projects, refresh } = await useFetch<Project[]>('/api/projects')
const toast = useToast()
const showModal = ref(false)

const form = reactive({
  name: '',
  clientName: '',
  description: '',
  status: 'active' as 'active' | 'paused' | 'completed',
  sprintCadenceDays: 14,
})

async function create() {
  await $fetch('/api/projects', { method: 'POST', body: { ...form } })
  toast.add({ title: 'Project created', color: 'green' })
  showModal.value = false
  Object.assign(form, { name: '', clientName: '', description: '' })
  refresh()
}

async function softDelete(id: string) {
  await $fetch(`/api/projects/${id}`, { method: 'DELETE' })
  toast.add({ title: 'Project deleted', color: 'green' })
  refresh()
}
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Projects</h1>
      <UButton icon="i-heroicons-plus" size="sm" @click="showModal = true">New Project</UButton>
    </div>

    <UCard v-if="projects?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="project in projects" :key="project.id" class="flex items-center justify-between py-3">
          <div>
            <p class="font-medium text-gray-800">{{ project.name }}</p>
            <p class="text-xs text-gray-500">{{ project.clientName }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="project.status === 'active' ? 'green' : 'gray'" variant="subtle">{{ project.status }}</UBadge>
            <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" @click="softDelete(project.id)" />
          </div>
        </li>
      </ul>
    </UCard>

    <UModal v-model="showModal">
      <UCard>
        <template #header><h3 class="font-semibold">New Project</h3></template>
        <div class="space-y-4">
          <UFormGroup label="Project Name"><UInput v-model="form.name" /></UFormGroup>
          <UFormGroup label="Client Name"><UInput v-model="form.clientName" /></UFormGroup>
          <UFormGroup label="Description"><UTextarea v-model="form.description" :rows="3" /></UFormGroup>
          <UFormGroup label="Sprint Cadence (days)">
            <UInput v-model.number="form.sprintCadenceDays" type="number" min="1" max="90" />
          </UFormGroup>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="outline" @click="showModal = false">Cancel</UButton>
            <UButton @click="create">Create</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
