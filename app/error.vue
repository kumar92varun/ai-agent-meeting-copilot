<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message: string } }>()
const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div class="text-center max-w-md">
      <p class="text-6xl font-bold text-gray-300 mb-4">{{ error.statusCode }}</p>
      <h1 class="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h1>
      <p class="text-gray-500 mb-6">{{ error.message }}</p>
      <UButton @click="handleError">Go home</UButton>
    </div>
  </div>
</template>
