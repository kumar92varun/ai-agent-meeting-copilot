<script setup lang="ts">
import type { User, Project } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

const { data: users, refresh } = await useFetch<User[]>('/api/admin/users')
const { data: projects } = await useFetch<Project[]>('/api/projects')
const toast = useToast()
const showModal = ref(false)

const form = reactive({
  name: '',
  email: '',
  role: 'project_lead' as 'admin' | 'project_lead',
  projectIds: [] as string[],
})

async function create() {
  await $fetch('/api/admin/users', { method: 'POST', body: { ...form } })
  toast.add({ title: 'User created', color: 'green' })
  showModal.value = false
  refresh()
}

const roleOptions = ['admin', 'project_lead']
const projectOptions = computed(() =>
  (projects.value || []).map((p) => ({ label: p.name, value: p.id }))
)
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Users</h1>
      <UButton icon="i-heroicons-plus" size="sm" @click="showModal = true">Invite User</UButton>
    </div>

    <UCard v-if="users?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="u in users" :key="u.id" class="flex items-center justify-between py-3">
          <div class="flex items-center gap-3">
            <UAvatar :src="u.avatarUrl || undefined" :alt="u.name" size="sm" />
            <div>
              <p class="font-medium text-gray-800">{{ u.name }}</p>
              <p class="text-xs text-gray-500">{{ u.email }}</p>
            </div>
          </div>
          <UBadge :color="u.role === 'admin' ? 'blue' : 'gray'" variant="subtle">{{ u.role.replace('_', ' ') }}</UBadge>
        </li>
      </ul>
    </UCard>

    <UModal v-model="showModal">
      <UCard>
        <template #header><h3 class="font-semibold">Invite User</h3></template>
        <div class="space-y-4">
          <UFormGroup label="Name"><UInput v-model="form.name" /></UFormGroup>
          <UFormGroup label="Email"><UInput v-model="form.email" type="email" /></UFormGroup>
          <UFormGroup label="Role"><USelect v-model="form.role" :options="roleOptions" /></UFormGroup>
          <UFormGroup v-if="form.role === 'project_lead'" label="Assign to Projects">
            <USelectMenu v-model="form.projectIds" :options="projectOptions" multiple />
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
