<script setup lang="ts">
const props = defineProps<{ status: string }>()

const color = computed(() => {
  const map: Record<string, string> = {
    active: 'green',
    completed: 'blue',
    paused: 'yellow',
    open: 'red',
    acknowledged: 'yellow',
    resolved: 'green',
    committed: 'blue',
    in_progress: 'blue',
    overdue: 'red',
    carried_over: 'orange',
    cancelled: 'gray',
    saved: 'green',
    failed: 'red',
    analyzing: 'blue',
    pending: 'gray',
  }
  return (map[props.status] ?? 'gray') as any
})

const label = computed(() => props.status.replace(/_/g, ' '))
</script>

<template>
  <UBadge :color="color" variant="subtle" class="capitalize">{{ label }}</UBadge>
</template>
