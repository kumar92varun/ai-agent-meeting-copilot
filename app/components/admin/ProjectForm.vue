<script setup lang="ts">
const props = defineProps<{
  modelValue: {
    name: string
    clientName: string
    description: string
    status: 'active' | 'paused' | 'completed'
    sprintCadenceDays: number
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

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
]
</script>

<template>
  <div class="space-y-4">
    <UFormGroup label="Project Name" required>
      <UInput :model-value="modelValue.name" @update:model-value="update('name', $event)" />
    </UFormGroup>
    <UFormGroup label="Client Name" required>
      <UInput :model-value="modelValue.clientName" @update:model-value="update('clientName', $event)" />
    </UFormGroup>
    <UFormGroup label="Description">
      <UTextarea :model-value="modelValue.description" :rows="3" @update:model-value="update('description', $event)" />
    </UFormGroup>
    <UFormGroup label="Status">
      <USelect :model-value="modelValue.status" :options="statusOptions" @update:model-value="update('status', $event)" />
    </UFormGroup>
    <UFormGroup label="Sprint Cadence (days)">
      <UInput
        :model-value="modelValue.sprintCadenceDays"
        type="number"
        min="1"
        max="90"
        @update:model-value="update('sprintCadenceDays', Number($event))"
      />
    </UFormGroup>
    <div class="flex justify-end gap-2 pt-2">
      <UButton color="gray" variant="outline" @click="emit('cancel')">Cancel</UButton>
      <UButton @click="emit('submit')">Save</UButton>
    </div>
  </div>
</template>
