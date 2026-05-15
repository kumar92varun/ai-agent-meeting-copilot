<script setup lang="ts">
import type { Risk } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

const query = reactive({ status: '', projectId: '', resourceId: '' })
const { data: risks, pending, refresh } = await useFetch<Risk[]>('/api/risks', {
  query: computed(() => Object.fromEntries(Object.entries(query).filter(([, v]) => v))),
})

const toast = useToast()

async function updateRisk(riskId: string, status: string) {
  await $fetch(`/api/risks/${riskId}`, { method: 'PATCH', body: { status } })
  toast.add({ title: `Risk marked as ${status}`, color: 'green' })
  refresh()
}

type UiColor = 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose' | 'primary' | 'gray'
const severityColor = (s: string): UiColor => {
  const map: Record<string, UiColor> = { critical: 'red', high: 'orange', medium: 'yellow', low: 'blue' }
  return map[s] ?? 'gray'
}
</script>

<template>
  <div class="p-4 md:p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Risks Inbox</h1>
      <UBadge v-if="risks?.length" color="red" variant="soft">{{ risks.length }} risk(s)</UBadge>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-6">
      <USelect v-model="query.status" :options="['', 'open', 'acknowledged', 'resolved']" placeholder="All statuses" class="w-40" />
    </div>

    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 4" :key="i" class="h-24 rounded-xl" />
    </div>

    <div v-else-if="risks?.length" class="space-y-3">
      <UCard v-for="risk in risks" :key="risk.id">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <UBadge :color="severityColor(risk.severity)" variant="subtle" class="uppercase text-xs">
                {{ risk.severity }}
              </UBadge>
              <UBadge color="gray" variant="subtle" class="text-xs">{{ risk.category.replace(/_/g, ' ') }}</UBadge>
              <UBadge :color="risk.status === 'open' ? 'red' : risk.status === 'acknowledged' ? 'yellow' : 'green'" variant="subtle" class="text-xs">
                {{ risk.status }}
              </UBadge>
            </div>
            <h3 class="font-semibold text-gray-900">{{ risk.title }}</h3>
            <p class="text-sm text-gray-600 mt-0.5">{{ risk.description }}</p>
            <p v-if="risk.sourceRawQuote" class="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
              "{{ risk.sourceRawQuote }}"
            </p>
            <p class="text-xs text-gray-400 mt-2">AI: {{ risk.aiReasoning }}</p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <UButton
              v-if="risk.status === 'open'"
              size="xs"
              color="yellow"
              variant="outline"
              @click="updateRisk(risk.id, 'acknowledged')"
            >
              Acknowledge
            </UButton>
            <UButton
              v-if="risk.status !== 'resolved'"
              size="xs"
              color="green"
              variant="outline"
              @click="updateRisk(risk.id, 'resolved')"
            >
              Resolve
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="text-center py-16 text-gray-400">
      <UIcon name="i-heroicons-check-circle" class="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p>No risks found matching the current filters.</p>
    </div>
  </div>
</template>
