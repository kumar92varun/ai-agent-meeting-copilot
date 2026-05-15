<script setup lang="ts">
import type { Resource, ResourceLeave } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

const { data: resources } = await useFetch<Resource[]>('/api/resources')
const { data: leaves, refresh } = await useFetch<ResourceLeave[]>('/api/resource-leaves')
const toast = useToast()

const form = reactive({
  resourceId: '',
  leaveType: 'pto' as 'pto' | 'sick' | 'personal' | 'training',
  startDate: '',
  endDate: '',
  notes: '',
})

async function create() {
  await $fetch('/api/resource-leaves', { method: 'POST', body: { ...form } })
  toast.add({ title: 'Leave recorded', color: 'green' })
  refresh()
}

async function remove(id: string) {
  await $fetch(`/api/resource-leaves/${id}`, { method: 'DELETE' })
  toast.add({ title: 'Leave removed', color: 'green' })
  refresh()
}

const resourceOptions = computed(() =>
  (resources.value || []).map((r) => ({ label: r.name, value: r.id }))
)
const resourceName = (id: string) => (resources.value || []).find((r) => r.id === id)?.name || id
const leaveTypeOptions = ['pto', 'sick', 'personal', 'training']
</script>

<template>
  <div class="p-4 md:p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Leave Management</h1>

    <UCard class="mb-6">
      <h3 class="font-semibold mb-4">Record Leave</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <USelect v-model="form.resourceId" :options="resourceOptions" placeholder="Resource" />
        <USelect v-model="form.leaveType" :options="leaveTypeOptions" placeholder="Leave Type" />
        <UInput v-model="form.startDate" type="date" placeholder="Start Date" />
        <UInput v-model="form.endDate" type="date" placeholder="End Date" />
        <UInput v-model="form.notes" placeholder="Notes (optional)" class="sm:col-span-2" />
      </div>
      <UButton class="mt-4" @click="create" :disabled="!form.resourceId || !form.startDate || !form.endDate">Record</UButton>
    </UCard>

    <UCard v-if="leaves?.length">
      <ul class="divide-y divide-gray-100">
        <li v-for="leave in leaves" :key="leave.id" class="flex items-center justify-between py-3">
          <div>
            <p class="font-medium text-gray-800">{{ resourceName(leave.resourceId) }}</p>
            <p class="text-xs text-gray-500">{{ leave.leaveType }} · {{ leave.startDate }} → {{ leave.endDate }}</p>
          </div>
          <UButton icon="i-heroicons-trash" color="red" variant="ghost" size="xs" @click="remove(leave.id)" />
        </li>
      </ul>
    </UCard>
  </div>
</template>
