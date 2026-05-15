<script setup lang="ts">
const props = defineProps<{
  modelValue: {
    name: string
    quickTeamsLink: string
  }
}>()

const emit = defineEmits<{
  'update:modelValue': [v: typeof props.modelValue]
  submit: []
  cancel: []
}>()

function update(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="space-y-4">
    <UFormGroup label="Project Name" required>
      <UInput :model-value="modelValue.name" @update:model-value="update('name', $event)" />
    </UFormGroup>
    <UFormGroup label="Teams Link">
      <UInput :model-value="modelValue.quickTeamsLink" placeholder="https://teams.microsoft.com/..." @update:model-value="update('quickTeamsLink', $event)" />
    </UFormGroup>
    <div class="flex justify-end gap-2 pt-2">
      <UButton color="gray" variant="outline" @click="emit('cancel')">Cancel</UButton>
      <UButton @click="emit('submit')">Save</UButton>
    </div>
  </div>
</template>
