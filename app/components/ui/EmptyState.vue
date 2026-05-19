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
  <div class="flex flex-col items-center justify-center py-20 text-center px-4">
    <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <UIcon :name="icon ?? 'i-heroicons-inbox'" class="w-7 h-7 text-slate-300" />
    </div>
    <p class="text-base font-semibold text-slate-500">{{ title }}</p>
    <p v-if="description" class="text-sm text-slate-400 mt-1 max-w-xs">{{ description }}</p>
    <UButton v-if="actionLabel && actionTo" :to="actionTo" size="sm" class="mt-5 rounded-xl" variant="outline">
      {{ actionLabel }}
    </UButton>
  </div>
</template>
