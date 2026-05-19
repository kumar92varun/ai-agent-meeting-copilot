<script setup lang="ts">
const props = defineProps<{ severity: string }>()

const color = computed(() => {
  const map: Record<string, string> = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'indigo',
  }
  return (map[props.severity] ?? 'gray') as any
})
</script>

<template>
  <UBadge :color="color" variant="subtle" class="uppercase text-xs font-semibold tracking-wide">
    {{ severity }}
  </UBadge>
</template>
