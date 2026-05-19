<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  breadcrumb?: Array<{ label: string; to?: string }>
}>()
</script>

<template>
  <div class="mb-8">
    <nav v-if="breadcrumb?.length" class="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
      <template v-for="(crumb, i) in breadcrumb" :key="i">
        <NuxtLink v-if="crumb.to" :to="crumb.to" class="hover:text-indigo-600 transition-colors font-medium">
          {{ crumb.label }}
        </NuxtLink>
        <span v-else class="text-slate-500">{{ crumb.label }}</span>
        <UIcon v-if="i < breadcrumb.length - 1" name="i-heroicons-chevron-right" class="w-3 h-3" />
      </template>
    </nav>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-slate-400 mt-0.5">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
  </div>
</template>
