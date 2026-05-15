<script setup lang="ts">
defineProps<{
  activeProjects: number
  openRisks: number
  standupsThisWeek: number
  resourcesAtRisk: number
}>()
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <UiStatCard
      label="Active Projects"
      :value="activeProjects"
      color="blue"
      icon="i-heroicons-briefcase"
    />
    <UiStatCard
      label="Open Risks"
      :value="openRisks"
      :color="openRisks > 0 ? 'red' : 'green'"
      icon="i-heroicons-exclamation-triangle"
    />
    <UiStatCard
      label="Standups This Week"
      :value="standupsThisWeek"
      icon="i-heroicons-microphone"
    />
    <UiStatCard
      label="Resources at Risk"
      :value="resourcesAtRisk"
      :color="resourcesAtRisk > 0 ? 'orange' : 'green'"
      icon="i-heroicons-user-minus"
    />
  </div>
</template>
