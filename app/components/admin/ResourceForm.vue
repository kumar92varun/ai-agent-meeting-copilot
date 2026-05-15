<script setup lang="ts">
const props = defineProps<{
  modelValue: {
    name: string
    email: string
    roleTitle: string
    resourceType: 'developer' | 'designer' | 'qa' | 'devops'
  }
}>()

const emit = defineEmits<{
  'update:modelValue': [v: typeof props.modelValue]
  submit: []
  cancel: []
}>()

function update(key: string, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const typeOptions = [
  { label: 'Developer', value: 'developer' },
  { label: 'Designer', value: 'designer' },
  { label: 'QA', value: 'qa' },
  { label: 'DevOps', value: 'devops' },
]
</script>

<template>
  <div class="space-y-4">
    <UFormGroup label="Full Name" required>
      <UInput :model-value="modelValue.name" @update:model-value="update('name', $event)" />
    </UFormGroup>
    <UFormGroup label="Email">
      <UInput :model-value="modelValue.email" type="email" @update:model-value="update('email', $event)" />
    </UFormGroup>
    <UFormGroup label="Role Title">
      <UInput :model-value="modelValue.roleTitle" placeholder="e.g. Senior Frontend Engineer" @update:model-value="update('roleTitle', $event)" />
    </UFormGroup>
    <UFormGroup label="Resource Type">
      <USelect
        :model-value="modelValue.resourceType"
        :options="typeOptions"
        @update:model-value="update('resourceType', $event)"
      />
    </UFormGroup>
    <div class="flex justify-end gap-2 pt-2">
      <UButton color="gray" variant="outline" @click="emit('cancel')">Cancel</UButton>
      <UButton @click="emit('submit')">Save</UButton>
    </div>
  </div>
</template>
