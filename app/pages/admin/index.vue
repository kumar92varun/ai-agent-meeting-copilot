<script setup lang="ts">
definePageMeta({ middleware: ['role'] })
</script>

<template>
  <div class="p-4 md:p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">Admin</h1>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-for="item in links" :key="item.to" :to="item.to">
        <UCard class="hover:shadow-md transition-shadow cursor-pointer h-full">
          <div class="flex items-center gap-3">
            <UIcon :name="item.icon" class="w-6 h-6 text-blue-600" />
            <div>
              <p class="font-semibold text-gray-800">{{ item.label }}</p>
              <p class="text-xs text-gray-500">{{ item.desc }}</p>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  setup() {
    const links = [
      { label: 'Projects', desc: 'Create and manage projects', to: '/admin/projects', icon: 'i-heroicons-briefcase' },
      { label: 'Resources', desc: 'Manage team members', to: '/admin/resources', icon: 'i-heroicons-users' },
      { label: 'Mappings', desc: 'Assign resources to projects', to: '/admin/mappings', icon: 'i-heroicons-arrows-right-left' },
      { label: 'Users', desc: 'Manage admin/project lead accounts', to: '/admin/users', icon: 'i-heroicons-user-circle' },
      { label: 'Notifications', desc: 'Configure email recipients', to: '/admin/notifications', icon: 'i-heroicons-bell' },
    ]
    return { links }
  },
}
</script>
