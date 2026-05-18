<script setup lang="ts">
import type { Project } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })
const { data: projects, refresh } = await useFetch<Project[]>('/api/projects')
const toast = useToast()
const showModal = ref(false)

const form = reactive({
  name: '',
  quickTeamsLink: '',
})

async function create() {
  await $fetch('/api/projects', { method: 'POST', body: { name: form.name, quickTeamsLink: form.quickTeamsLink || undefined } })
  toast.add({ title: 'Project created', color: 'green' })
  showModal.value = false
  Object.assign(form, { name: '', quickTeamsLink: '' })
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
            <p v-if="project.quickTeamsLink" class="text-xs text-blue-500">{{ project.quickTeamsLink }}</p>
          </div>
          <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" @click="softDelete(project.id)" />
        </li>
      </ul>
    </UCard>

    <UModal v-model="showModal">
      <UCard>
        <template #header><h3 class="font-semibold">New Project</h3></template>
        <div class="space-y-4">
          <UFormGroup label="Project Name"><UInput v-model="form.name" /></UFormGroup>
          <UFormGroup label="Quick Teams link"><UInput v-model="form.quickTeamsLink" placeholder="https://quickteams.example.com/..." /></UFormGroup>
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
