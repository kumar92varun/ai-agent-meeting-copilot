<script setup lang="ts">
import type { Project } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

const { user } = useUserSession()
const isAdmin = computed(() => (user.value as { role?: string })?.role === 'admin')
const toast = useToast()

const { data: projects, pending, refresh } = await useFetch<Project[]>('/api/projects')

// ── modal ──────────────────────────────────────────────────
const modalOpen = ref(false)
const editing = ref<Project | null>(null)

const form = reactive({
  name: '',
  quickTeamsLink: '',
})

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', quickTeamsLink: '' })
  modalOpen.value = true
}

function openEdit(project: Project) {
  editing.value = project
  Object.assign(form, {
    name: project.name,
    quickTeamsLink: project.quickTeamsLink ?? '',
  })
  modalOpen.value = true
}

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    const body = {
      name: form.name,
      quickTeamsLink: form.quickTeamsLink || undefined,
    }
    if (editing.value) {
      await $fetch(`/api/projects/${editing.value.id}`, { method: 'PATCH', body })
      toast.add({ title: 'Project updated', color: 'green' })
    } else {
      await $fetch('/api/projects', { method: 'POST', body })
      toast.add({ title: 'Project created', color: 'green' })
    }
    modalOpen.value = false
    await refresh()
  } catch {
    toast.add({ title: 'Failed to save project', color: 'red' })
  } finally {
    saving.value = false
  }
}

// ── delete ─────────────────────────────────────────────────
const deleting = ref<string | null>(null)
async function deleteProject(project: Project) {
  if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
  deleting.value = project.id
  try {
    await $fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    toast.add({ title: 'Project deleted', color: 'green' })
    await refresh()
  } catch {
    toast.add({ title: 'Failed to delete project', color: 'red' })
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Projects</h1>
      <UButton v-if="isAdmin" icon="i-heroicons-plus" @click="openCreate">New Project</UButton>
    </div>

    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-xl" />
    </div>

    <UCard v-else-if="projects?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="project in projects" :key="project.id" class="flex items-center justify-between py-3 px-1 gap-2">
          <NuxtLink :to="`/projects/${project.id}`" class="flex items-center gap-3 flex-1 min-w-0 hover:bg-gray-50 rounded-lg transition-colors">
            <div class="min-w-0 flex-1">
              <p class="font-medium text-gray-900 truncate">{{ project.name }}</p>
              <p v-if="project.quickTeamsLink" class="text-xs text-blue-500 truncate">{{ project.quickTeamsLink }}</p>
            </div>
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
          </NuxtLink>
          <div v-if="isAdmin" class="flex items-center gap-1 shrink-0">
            <UButton icon="i-heroicons-pencil-square" color="gray" variant="ghost" size="xs" @click.prevent="openEdit(project)" />
            <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" :loading="deleting === project.id" @click.prevent="deleteProject(project)" />
          </div>
        </li>
      </ul>
    </UCard>

    <div v-else class="text-center py-16 text-gray-400">
      <p>{{ isAdmin ? 'No projects yet.' : 'No projects yet. Ask an admin to create one.' }}</p>
      <UButton v-if="isAdmin" class="mt-4" icon="i-heroicons-plus" @click="openCreate">
        Create your first project
      </UButton>
    </div>

    <!-- Create / Edit modal -->
    <UModal v-model="modalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">{{ editing ? 'Edit Project' : 'New Project' }}</h3>
        </template>

        <div class="space-y-4">
          <UFormGroup label="Project name" required>
            <UInput v-model="form.name" placeholder="e.g. Acme Mobile App" />
          </UFormGroup>
          <UFormGroup label="Teams link">
            <UInput v-model="form.quickTeamsLink" placeholder="https://teams.microsoft.com/..." />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="outline" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" :disabled="!form.name" @click="save">
              {{ editing ? 'Save changes' : 'Create project' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
