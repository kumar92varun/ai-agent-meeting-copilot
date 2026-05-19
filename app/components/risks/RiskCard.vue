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

const leftBorderColor = computed(() => {
  const map: Record<string, string> = {
    critical: 'border-l-rose-500',
    high: 'border-l-orange-400',
    medium: 'border-l-amber-400',
    low: 'border-l-blue-300',
  }
  return map[props.risk.severity] ?? 'border-l-slate-200'
})
</script>

<template>
  <div :class="['bg-white rounded-2xl border border-slate-100 shadow-sm p-5 border-l-4', leftBorderColor]">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-2.5">
          <UiSeverityBadge :severity="risk.severity" />
          <UBadge color="gray" variant="subtle" class="text-xs capitalize">
            {{ risk.category.replace(/_/g, ' ') }}
          </UBadge>
          <UiStatusBadge :status="risk.status" />
        </div>

        <h3 class="font-semibold text-slate-900 mb-1">{{ risk.title }}</h3>
        <p class="text-sm text-slate-600 leading-relaxed">{{ risk.description }}</p>
        <p class="text-xs text-slate-400 mt-1.5 italic">{{ risk.aiReasoning }}</p>

        <blockquote
          v-if="risk.sourceRawQuote"
          class="mt-2.5 text-xs text-slate-500 italic border-l-2 border-slate-200 pl-3 py-0.5"
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
          class="rounded-lg"
          @click="updateStatus('acknowledged')"
        >
          Acknowledge
        </UButton>
        <UButton
          v-if="risk.status !== 'resolved'"
          size="xs"
          color="green"
          variant="outline"
          class="rounded-lg"
          @click="updateStatus('resolved')"
        >
          Resolve
        </UButton>
      </div>
    </div>
  </div>
</template>
