<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  color?: string
  icon?: string
}>()

const iconBgMap: Record<string, string> = {
  blue: 'bg-indigo-50',
  indigo: 'bg-indigo-50',
  red: 'bg-rose-50',
  green: 'bg-emerald-50',
  orange: 'bg-amber-50',
  yellow: 'bg-yellow-50',
}

const iconColorMap: Record<string, string> = {
  blue: 'text-indigo-500',
  indigo: 'text-indigo-500',
  red: 'text-rose-500',
  green: 'text-emerald-500',
  orange: 'text-amber-500',
  yellow: 'text-yellow-500',
}

const valueColorMap: Record<string, string> = {
  blue: 'text-indigo-600',
  indigo: 'text-indigo-600',
  red: 'text-rose-600',
  green: 'text-emerald-600',
  orange: 'text-amber-600',
  yellow: 'text-yellow-600',
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <div class="flex items-start justify-between mb-3">
      <div
        v-if="icon"
        :class="[color ? iconBgMap[color] : 'bg-slate-50', 'w-10 h-10 rounded-xl flex items-center justify-center']"
      >
        <UIcon :name="icon" :class="[color ? iconColorMap[color] : 'text-slate-400', 'w-5 h-5']" />
      </div>
    </div>
    <p :class="[color ? valueColorMap[color] : 'text-slate-800', 'text-3xl font-bold tracking-tight']">
      {{ value }}
    </p>
    <p class="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">{{ label }}</p>
  </div>
</template>
