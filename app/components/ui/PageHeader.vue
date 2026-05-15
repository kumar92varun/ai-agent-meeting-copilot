<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  breadcrumb?: Array<{ label: string; to?: string }>
}>()
</script>

<template>
  <div class="mb-6">
    <nav v-if="breadcrumb?.length" class="flex items-center gap-1.5 text-sm text-gray-400 mb-1">
      <template v-for="(crumb, i) in breadcrumb" :key="i">
        <NuxtLink v-if="crumb.to" :to="crumb.to" class="hover:text-blue-600 transition-colors">
          {{ crumb.label }}
        </NuxtLink>
        <span v-else>{{ crumb.label }}</span>
        <UIcon v-if="i < breadcrumb.length - 1" name="i-heroicons-chevron-right" class="w-3.5 h-3.5" />
      </template>
    </nav>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-0.5">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
  </div>
</template>
