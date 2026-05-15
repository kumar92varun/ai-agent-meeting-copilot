<script setup lang="ts">
defineProps<{ risks: Record<string, unknown>[] }>()
</script>

<template>
  <UCard>
    <h3 class="font-semibold text-gray-800 mb-4">
      Detected Risks
      <span class="text-gray-400 font-normal">({{ risks.length }})</span>
    </h3>

    <UiEmptyState
      v-if="!risks.length"
      icon="i-heroicons-check-circle"
      title="No risks detected"
      description="Clean standup — nothing flagged."
    />

    <div v-else class="space-y-3">
      <div
        v-for="(risk, i) in risks"
        :key="i"
        class="border border-red-100 bg-red-50 rounded-lg p-4"
      >
        <div class="flex items-start gap-3">
          <UiSeverityBadge :severity="risk.severity as string" class="flex-shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs text-gray-500">
                {{ String(risk.category).replace(/_/g, ' ') }}
              </span>
              <span class="text-xs text-gray-400">·</span>
              <span class="text-xs text-gray-500 capitalize">{{ risk.riskType }}</span>
            </div>
            <p class="font-medium text-sm text-gray-900">{{ risk.title }}</p>
            <p class="text-xs text-gray-600 mt-0.5">{{ risk.description }}</p>
            <p class="text-xs text-gray-400 mt-1">AI: {{ risk.aiReasoning }}</p>
            <blockquote
              v-if="risk.sourceRawQuote"
              class="mt-2 text-xs text-gray-500 italic border-l-2 border-red-200 pl-2"
            >
              "{{ risk.sourceRawQuote }}"
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
