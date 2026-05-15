<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  color?: string
  icon?: string
}>()
</script>

<template>
  <UCard>
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-gray-500 mb-1">{{ label }}</p>
        <p
          class="text-3xl font-bold"
          :class="color ? `text-${color}-600` : 'text-gray-800'"
        >
          {{ value }}
        </p>
      </div>
      <UIcon v-if="icon" :name="icon" class="w-6 h-6 text-gray-300 mt-1" />
    </div>
  </UCard>
</template>
