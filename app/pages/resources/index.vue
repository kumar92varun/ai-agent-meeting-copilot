<script setup lang="ts">
import type { Resource } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

const { user } = useUserSession()
const isAdmin = computed(() => (user.value as { role?: string })?.role === 'admin')
const toast = useToast()

const { data: resources, pending, refresh } = await useFetch<Resource[]>('/api/resources')

const resourceTypeOptions = [
  { label: 'Developer', value: 'developer' },
  { label: 'Designer', value: 'designer' },
  { label: 'QA', value: 'qa' },
  { label: 'DevOps', value: 'devops' },
]

const roleOptions = [
  { label: 'Project Lead', value: 'project_lead' },
  { label: 'Admin', value: 'admin' },
]

// ── modal ──────────────────────────────────────────────────
const modalOpen = ref(false)
const editing = ref<Resource | null>(null)

const form = reactive({
  name: '',
  email: '',
  resourceType: 'developer' as Resource['resourceType'],
  isActive: true,
  quickTeamsLink: '',
  role: 'project_lead' as Resource['role'],
})

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', email: '', resourceType: 'developer', isActive: true, quickTeamsLink: '', role: 'project_lead' })
  modalOpen.value = true
}

function openEdit(r: Resource) {
  editing.value = r
  Object.assign(form, {
    name: r.name,
    email: r.email ?? '',
    resourceType: r.resourceType,
    isActive: r.isActive,
    quickTeamsLink: r.quickTeamsLink ?? '',
    role: r.role,
  })
  modalOpen.value = true
}

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    const body = {
      name: form.name,
      email: form.email || undefined,
      resourceType: form.resourceType,
      isActive: form.isActive,
      quickTeamsLink: form.quickTeamsLink || undefined,
      role: form.role,
    }
    if (editing.value) {
      await $fetch(`/api/resources/${editing.value.id}`, { method: 'PATCH', body })
      toast.add({ title: 'Resource updated', color: 'green' })
    } else {
      await $fetch('/api/resources', { method: 'POST', body })
      toast.add({ title: 'Resource created', color: 'green' })
    }
    modalOpen.value = false
    await refresh()
  } catch {
    toast.add({ title: 'Failed to save resource', color: 'red' })
  } finally {
    saving.value = false
  }
}

// ── delete ─────────────────────────────────────────────────
const deleting = ref<string | null>(null)
async function deleteResource(r: Resource) {
  if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return
  deleting.value = r.id
  try {
    await $fetch(`/api/resources/${r.id}`, { method: 'DELETE' })
    toast.add({ title: 'Resource deleted', color: 'green' })
    await refresh()
  } catch {
    toast.add({ title: 'Failed to delete resource', color: 'red' })
  } finally {
    deleting.value = null
  }
}

const resourceTypeColor: Record<string, string> = {
  developer: 'blue',
  designer: 'purple',
  qa: 'orange',
  devops: 'green',
}
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Resources</h1>
      <UButton v-if="isAdmin" icon="i-heroicons-plus" @click="openCreate">New Resource</UButton>
    </div>

    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 5" :key="i" class="h-14 rounded-xl" />
    </div>

    <UCard v-else-if="resources?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="r in resources" :key="r.id" class="flex items-center justify-between py-3 px-1 gap-2">
          <NuxtLink :to="`/resources/${r.id}`" class="flex items-center gap-3 flex-1 min-w-0 hover:bg-gray-50 rounded-lg transition-colors">
            <UAvatar :alt="r.name" size="sm" />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-gray-900 truncate">{{ r.name }}</p>
              <p v-if="r.email" class="text-xs text-gray-400 truncate">{{ r.email }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UBadge :color="(resourceTypeColor[r.resourceType] ?? 'gray') as any" variant="subtle" class="capitalize">
                {{ r.resourceType }}
              </UBadge>
              <UBadge :color="r.isActive ? 'green' : 'gray'" variant="subtle">
                {{ r.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
              <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400" />
            </div>
          </NuxtLink>
          <div v-if="isAdmin" class="flex items-center gap-1 shrink-0">
            <UButton icon="i-heroicons-pencil-square" color="gray" variant="ghost" size="xs" @click.prevent="openEdit(r)" />
            <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" :loading="deleting === r.id" @click.prevent="deleteResource(r)" />
          </div>
        </li>
      </ul>
    </UCard>

    <div v-else class="text-center py-16 text-gray-400">
      <p>{{ isAdmin ? 'No resources yet.' : 'No resources found.' }}</p>
      <UButton v-if="isAdmin" class="mt-4" icon="i-heroicons-plus" @click="openCreate">Add first resource</UButton>
    </div>

    <!-- Create / Edit modal -->
    <UModal v-model="modalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">{{ editing ? 'Edit Resource' : 'New Resource' }}</h3>
        </template>

        <div class="space-y-4">
          <UFormGroup label="Name" required>
            <UInput v-model="form.name" placeholder="e.g. Rahul Sharma" />
          </UFormGroup>
          <UFormGroup label="Email">
            <UInput v-model="form.email" type="email" placeholder="rahul@crownstack.com" />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Type">
              <USelect v-model="form.resourceType" :options="resourceTypeOptions" />
            </UFormGroup>
            <UFormGroup label="Role">
              <USelect v-model="form.role" :options="roleOptions" />
            </UFormGroup>
          </div>
          <UFormGroup label="Quick Teams link">
            <UInput v-model="form.quickTeamsLink" placeholder="https://quickteams.example.com/..." />
          </UFormGroup>
          <UFormGroup label="Status">
            <div class="flex items-center gap-3 pt-1">
              <UToggle v-model="form.isActive" />
              <span class="text-sm text-gray-600">{{ form.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="outline" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" :disabled="!form.name" @click="save">
              {{ editing ? 'Save changes' : 'Create resource' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
