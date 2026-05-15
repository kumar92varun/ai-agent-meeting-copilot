<script setup lang="ts">
const props = defineProps<{ score: number | null | undefined }>()

const color = computed(() => {
  if (props.score == null) return 'gray'
  if (props.score >= 80) return 'green'
  if (props.score >= 60) return 'yellow'
  return 'red'
})

const label = computed(() => {
  if (props.score == null) return 'No data'
  return `${Math.round(props.score)}`
})
</script>

<template>
  <UBadge :color="color" variant="subtle">{{ label }}</UBadge>
</template>
