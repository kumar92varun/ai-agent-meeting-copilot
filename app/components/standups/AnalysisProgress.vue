<script setup lang="ts">
const props = defineProps<{
  completedNodes: string[]
  error?: string
}>()

const ALL_NODES = [
  { key: 'parse-transcript', label: 'Parsing transcript' },
  { key: 'infer-attendance', label: 'Inferring attendance' },
  { key: 'extract-tasks', label: 'Extracting tasks' },
  { key: 'match-existing-tasks', label: 'Matching existing tasks' },
  { key: 'resolve-deadlines', label: 'Resolving deadlines' },
  { key: 'estimate-hours', label: 'Estimating hours' },
  { key: 'detect-risks', label: 'Detecting risks' },
]

const activeIndex = computed(() => props.completedNodes.length)
</script>

<template>
  <UCard>
    <h2 class="font-semibold text-gray-800 mb-5">Analyzing transcript…</h2>
    <ul class="space-y-3">
      <li v-for="(node, i) in ALL_NODES" :key="node.key" class="flex items-center gap-3">
        <div class="w-5 h-5 flex-shrink-0 flex items-center justify-center">
          <UIcon
            v-if="completedNodes.includes(node.key)"
            name="i-heroicons-check-circle"
            class="w-5 h-5 text-green-500"
          />
          <span
            v-else-if="i === activeIndex"
            class="block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
          />
          <span v-else class="block w-4 h-4 rounded-full border-2 border-gray-200" />
        </div>
        <span
          class="text-sm transition-colors"
          :class="completedNodes.includes(node.key) ? 'text-gray-800 font-medium' : i === activeIndex ? 'text-blue-600' : 'text-gray-400'"
        >
          {{ node.label }}
        </span>
      </li>
    </ul>

    <UAlert v-if="error" color="red" variant="soft" class="mt-4" :description="error">
      <template #title>Analysis error</template>
    </UAlert>
  </UCard>
</template>
