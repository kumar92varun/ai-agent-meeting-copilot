<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center px-4">
    <UIcon
      :name="icon ?? 'i-heroicons-inbox'"
      class="w-12 h-12 text-gray-300 mb-4"
    />
    <p class="text-base font-medium text-gray-500">{{ title }}</p>
    <p v-if="description" class="text-sm text-gray-400 mt-1">{{ description }}</p>
    <UButton v-if="actionLabel && actionTo" :to="actionTo" size="sm" class="mt-4" variant="outline">
      {{ actionLabel }}
    </UButton>
  </div>
</template>
