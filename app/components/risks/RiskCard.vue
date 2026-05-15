<script setup lang="ts">
import type { Risk } from '../../../shared/types/domain'

const props = defineProps<{ risk: Risk }>()
const emit = defineEmits<{ updated: [] }>()
const toast = useToast()

async function updateStatus(status: 'acknowledged' | 'resolved') {
  await $fetch(`/api/risks/${props.risk.id}`, { method: 'PATCH', body: { status } })
  toast.add({ title: `Risk ${status}`, color: 'green' })
  emit('updated')
}
</script>

<template>
  <UCard>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <UiSeverityBadge :severity="risk.severity" />
          <UBadge color="gray" variant="subtle" class="text-xs">
            {{ risk.category.replace(/_/g, ' ') }}
          </UBadge>
          <UiStatusBadge :status="risk.status" />
        </div>

        <h3 class="font-semibold text-gray-900 mb-0.5">{{ risk.title }}</h3>
        <p class="text-sm text-gray-600">{{ risk.description }}</p>
        <p class="text-xs text-gray-400 mt-1">AI reasoning: {{ risk.aiReasoning }}</p>

        <blockquote
          v-if="risk.sourceRawQuote"
          class="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2"
        >
          "{{ risk.sourceRawQuote }}"
        </blockquote>
      </div>

      <div class="flex gap-2 flex-shrink-0">
        <UButton
          v-if="risk.status === 'open'"
          size="xs"
          color="yellow"
          variant="outline"
          @click="updateStatus('acknowledged')"
        >
          Acknowledge
        </UButton>
        <UButton
          v-if="risk.status !== 'resolved'"
          size="xs"
          color="green"
          variant="outline"
          @click="updateStatus('resolved')"
        >
          Resolve
        </UButton>
      </div>
    </div>
  </UCard>
</template>
