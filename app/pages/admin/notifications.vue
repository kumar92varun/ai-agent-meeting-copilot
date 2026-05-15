<script setup lang="ts">
import type { NotificationSetting } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

const { data: settings, refresh } = await useFetch<NotificationSetting>('/api/admin/notification-settings')
const toast = useToast()

const form = reactive({
  dailyRiskDigestEnabled: true,
  immediateRiskAlertEnabled: false,
  severityThreshold: 'medium' as 'low' | 'medium' | 'high' | 'critical',
})

watchEffect(() => {
  if (settings.value) Object.assign(form, settings.value)
})

async function save() {
  await $fetch('/api/admin/notification-settings', { method: 'PATCH', body: { ...form } })
  toast.add({ title: 'Settings saved', color: 'green' })
  refresh()
}

const severityOptions = ['low', 'medium', 'high', 'critical']
</script>

<template>
  <div class="p-4 md:p-8 max-w-xl">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Notification Settings</h1>

    <UCard class="space-y-6">
      <UFormGroup label="Daily Risk Digest">
        <div class="flex items-center gap-3">
          <UToggle v-model="form.dailyRiskDigestEnabled" />
          <span class="text-sm text-gray-600">Receive daily email digest at 9am IST</span>
        </div>
      </UFormGroup>

      <UFormGroup label="Immediate Risk Alerts">
        <div class="flex items-center gap-3">
          <UToggle v-model="form.immediateRiskAlertEnabled" />
          <span class="text-sm text-gray-600">Get emailed when a new risk is detected</span>
        </div>
      </UFormGroup>

      <UFormGroup label="Minimum Severity to Alert">
        <USelect v-model="form.severityThreshold" :options="severityOptions" />
      </UFormGroup>

      <UButton @click="save">Save Settings</UButton>
    </UCard>
  </div>
</template>
