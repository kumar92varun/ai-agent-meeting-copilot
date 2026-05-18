<script setup lang="ts">
import type { Resource, Risk, DailyMetricsResource, Task, ProjectResourceTask } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })
const route = useRoute()
const router = useRouter()
const resourceId = route.params.id as string
const { user } = useUserSession()
const isAdmin = computed(() => (user.value as { role?: string })?.role === 'admin')
const toast = useToast()

interface ResourceTaskRow {
  task: Task
  assignment: ProjectResourceTask
}

const { data: resource, refresh: refreshResource } = await useFetch<Resource>(`/api/resources/${resourceId}`)
const { data: tasks } = await useFetch<ResourceTaskRow[]>('/api/tasks', { query: { resourceId } })
const { data: resourceRisks } = await useFetch<Risk[]>('/api/risks', { query: { resourceId } })

const tabs = ['Performance', 'Tasks', 'Standups', 'Risks']
const selectedTab = ref(0)

const dateRange = reactive({ from: '', to: '' })
const { data: metrics } = await useFetch<DailyMetricsResource[]>('/api/metrics/resource-summary', {
  query: computed(() => ({ resourceId, ...dateRange })),
})

const refreshing = ref(false)
async function refreshMetrics() {
  refreshing.value = true
  try {
    await $fetch(`/api/resources/${resourceId}/refresh-metrics`, { method: 'POST' })
    toast.add({ title: 'Refresh queued', color: 'green' })
  } finally {
    refreshing.value = false
  }
}

// ── edit modal ─────────────────────────────────────────────
const editOpen = ref(false)
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
const editForm = reactive({
  name: '', email: '', resourceType: 'developer' as Resource['resourceType'],
  isActive: true, quickTeamsLink: '', role: 'project_lead' as Resource['role'],
})

function openEdit() {
  if (!resource.value) return
  Object.assign(editForm, {
    name: resource.value.name,
    email: resource.value.email ?? '',
    resourceType: resource.value.resourceType,
    isActive: resource.value.isActive,
    quickTeamsLink: resource.value.quickTeamsLink ?? '',
    role: resource.value.role,
  })
  editOpen.value = true
}

const saving = ref(false)
async function saveEdit() {
  saving.value = true
  try {
    await $fetch(`/api/resources/${resourceId}`, {
      method: 'PATCH',
      body: {
        name: editForm.name,
        email: editForm.email || undefined,
        resourceType: editForm.resourceType,
        isActive: editForm.isActive,
        quickTeamsLink: editForm.quickTeamsLink || null,
        role: editForm.role,
      },
    })
    toast.add({ title: 'Resource updated', color: 'green' })
    editOpen.value = false
    await refreshResource()
  } catch {
    toast.add({ title: 'Failed to update resource', color: 'red' })
  } finally {
    saving.value = false
  }
}

// ── delete ─────────────────────────────────────────────────
const deleting = ref(false)
async function deleteResource() {
  if (!confirm(`Delete "${resource.value?.name}"? This cannot be undone.`)) return
  deleting.value = true
  try {
    await $fetch(`/api/resources/${resourceId}`, { method: 'DELETE' })
    toast.add({ title: 'Resource deleted', color: 'green' })
    router.push('/resources')
  } catch {
    toast.add({ title: 'Failed to delete resource', color: 'red' })
    deleting.value = false
  }
}
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <NuxtLink to="/resources" class="hover:text-blue-600">Resources</NuxtLink>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
          <span>{{ resource?.name }}</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{{ resource?.name }}</h1>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-sm text-gray-500 capitalize">{{ resource?.resourceType }}</span>
          <UBadge :color="resource?.isActive ? 'green' : 'gray'" variant="subtle" size="xs">
            {{ resource?.isActive ? 'Active' : 'Inactive' }}
          </UBadge>
          <UBadge v-if="resource?.role === 'admin'" color="purple" variant="subtle" size="xs">Admin</UBadge>
        </div>
        <a v-if="resource?.quickTeamsLink" :href="resource.quickTeamsLink" target="_blank" rel="noopener" class="text-sm text-blue-500 hover:underline mt-1 inline-block">Quick Teams link</a>
      </div>
      <div class="flex gap-2">
        <UButton icon="i-heroicons-arrow-path" color="gray" variant="outline" size="sm" :loading="refreshing" @click="refreshMetrics">
          Refresh Metrics
        </UButton>
        <UButton v-if="isAdmin" icon="i-heroicons-pencil-square" color="gray" variant="outline" size="sm" @click="openEdit">Edit</UButton>
        <UButton v-if="isAdmin" icon="i-heroicons-trash" color="red" variant="outline" size="sm" :loading="deleting" @click="deleteResource">Delete</UButton>
      </div>
    </div>

    <!-- Edit modal -->
    <UModal v-model="editOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Edit Resource</h3>
        </template>
        <div class="space-y-4">
          <UFormGroup label="Name" required>
            <UInput v-model="editForm.name" />
          </UFormGroup>
          <UFormGroup label="Email">
            <UInput v-model="editForm.email" type="email" />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup label="Type">
              <USelect v-model="editForm.resourceType" :options="resourceTypeOptions" />
            </UFormGroup>
            <UFormGroup label="Role">
              <USelect v-model="editForm.role" :options="roleOptions" />
            </UFormGroup>
          </div>
          <UFormGroup label="Quick Teams link">
            <UInput v-model="editForm.quickTeamsLink" placeholder="https://quickteams.example.com/..." />
          </UFormGroup>
          <UFormGroup label="Status">
            <div class="flex items-center gap-3 pt-1">
              <UToggle v-model="editForm.isActive" />
              <span class="text-sm text-gray-600">{{ editForm.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
          </UFormGroup>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="outline" @click="editOpen = false">Cancel</UButton>
            <UButton :loading="saving" :disabled="!editForm.name" @click="saveEdit">Save changes</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <UTabs :items="tabs.map(t => ({ label: t }))" v-model="selectedTab" class="mb-6" />

    <!-- Performance -->
    <div v-if="selectedTab === 0">
      <div v-if="metrics?.length" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <UCard v-for="m in metrics.slice(0, 1)" :key="m.id">
          <p class="text-sm text-gray-500">Attendance Rate</p>
          <p class="text-2xl font-bold text-blue-600">{{ (m.attendanceRate * 100).toFixed(0) }}%</p>
        </UCard>
        <UCard v-if="metrics[0]">
          <p class="text-sm text-gray-500">Tasks Committed</p>
          <p class="text-2xl font-bold text-gray-800">{{ metrics[0].tasksCommitted }}</p>
        </UCard>
        <UCard v-if="metrics[0]">
          <p class="text-sm text-gray-500">Completed On Time</p>
          <p class="text-2xl font-bold text-green-600">{{ metrics[0].tasksCompletedOnTime }}</p>
        </UCard>
        <UCard v-if="metrics[0]">
          <p class="text-sm text-gray-500">Tasks Slipped</p>
          <p class="text-2xl font-bold text-red-500">{{ metrics[0].tasksSlipped }}</p>
        </UCard>
      </div>
      <div v-else class="text-center py-12 text-gray-400">No metrics yet. Run a refresh to compute.</div>
    </div>

    <!-- Tasks -->
    <div v-else-if="selectedTab === 1">
      <UCard v-if="tasks?.length">
        <ul class="divide-y divide-gray-100">
          <li v-for="row in tasks" :key="row.task.id" class="py-3 flex items-center justify-between">
            <p class="font-medium text-gray-800">{{ row.task.title }}</p>
            <UBadge variant="subtle">{{ row.task.status }}</UBadge>
          </li>
        </ul>
      </UCard>
      <div v-else class="text-center py-12 text-gray-400">No tasks found.</div>
    </div>

    <!-- Standups placeholder -->
    <div v-else-if="selectedTab === 2">
      <div class="text-center py-12 text-gray-400">Standup history by resource coming soon.</div>
    </div>

    <!-- Risks -->
    <div v-else-if="selectedTab === 3">
      <UCard v-if="resourceRisks?.length">
        <ul class="divide-y divide-gray-100">
          <li v-for="risk in resourceRisks" :key="risk.id" class="py-3 flex items-start justify-between gap-2">
            <div>
              <p class="font-medium text-gray-800">{{ risk.title }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ risk.description }}</p>
            </div>
            <UBadge :color="risk.severity === 'critical' ? 'red' : risk.severity === 'high' ? 'orange' : 'yellow'" variant="subtle">
              {{ risk.severity }}
            </UBadge>
          </li>
        </ul>
      </UCard>
      <div v-else class="text-center py-12 text-gray-400">No risks detected.</div>
    </div>
  </div>
</template>
