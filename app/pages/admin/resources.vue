<script setup lang="ts">
import type { Resource } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })
const { data: resources, refresh } = await useFetch<Resource[]>('/api/resources')
const toast = useToast()
const showModal = ref(false)

const form = reactive({
  name: '',
  email: '',
  resourceType: 'developer' as 'developer' | 'designer' | 'qa' | 'devops',
  quickTeamsLink: '',
})

async function create() {
  await $fetch('/api/resources', { method: 'POST', body: { name: form.name, email: form.email || undefined, resourceType: form.resourceType, quickTeamsLink: form.quickTeamsLink || undefined } })
  toast.add({ title: 'Resource created', color: 'green' })
  showModal.value = false
  Object.assign(form, { name: '', email: '', quickTeamsLink: '' })
  refresh()
}

async function softDelete(id: string) {
  await $fetch(`/api/resources/${id}`, { method: 'DELETE' })
  toast.add({ title: 'Resource removed', color: 'green' })
  refresh()
}

const typeOptions = ['developer', 'designer', 'qa', 'devops']
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Resources</h1>
      <UButton icon="i-heroicons-plus" size="sm" @click="showModal = true">New Resource</UButton>
    </div>

    <UCard v-if="resources?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="r in resources" :key="r.id" class="flex items-center justify-between py-3">
          <div>
            <p class="font-medium text-gray-800">{{ r.name }}</p>
            <p class="text-xs text-gray-500">{{ r.resourceType }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="r.isActive ? 'green' : 'gray'" variant="subtle">{{ r.isActive ? 'Active' : 'Inactive' }}</UBadge>
            <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" @click="softDelete(r.id)" />
          </div>
        </li>
      </ul>
    </UCard>

    <UModal v-model="showModal">
      <UCard>
        <template #header><h3 class="font-semibold">New Resource</h3></template>
        <div class="space-y-4">
          <UFormGroup label="Name"><UInput v-model="form.name" /></UFormGroup>
          <UFormGroup label="Email"><UInput v-model="form.email" type="email" /></UFormGroup>
          <UFormGroup label="Type">
            <USelect v-model="form.resourceType" :options="typeOptions" />
          </UFormGroup>
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
