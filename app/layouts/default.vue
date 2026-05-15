<script setup lang="ts">
const { user, clear } = useUserSession()
const route = useRoute()

const navItems = computed(() => {
  const base = [
    { label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/dashboard' },
    { label: 'Projects', icon: 'i-heroicons-briefcase', to: '/projects' },
    { label: 'Resources', icon: 'i-heroicons-users', to: '/resources' },
    { label: 'Risks', icon: 'i-heroicons-exclamation-triangle', to: '/risks' },
    { label: 'Standups', icon: 'i-heroicons-microphone', to: '/standups/new' },
  ]
  if ((user.value as { role?: string })?.role === 'admin') {
    base.push({ label: 'Admin', icon: 'i-heroicons-cog-6-tooth', to: '/admin' })
  }
  return base
})

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar (desktop) -->
    <aside class="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 z-30">
      <div class="flex items-center h-16 px-6 border-b border-gray-100">
        <span class="text-lg font-bold text-blue-800">Standup Intel</span>
      </div>
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="route.path.startsWith(item.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
        >
          <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="p-4 border-t border-gray-100">
        <div class="flex items-center gap-3">
          <UAvatar :src="(user as { avatarUrl?: string })?.avatarUrl || undefined" size="sm" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ (user as { name?: string })?.name }}</p>
            <p class="text-xs text-gray-500 truncate capitalize">{{ (user as { role?: string })?.role?.replace('_', ' ') }}</p>
          </div>
          <UButton icon="i-heroicons-arrow-right-on-rectangle" color="gray" variant="ghost" size="xs" @click="logout" />
        </div>
      </div>
    </aside>

    <!-- Mobile top bar -->
    <div class="lg:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-4">
      <span class="text-base font-bold text-blue-800 flex-1">Standup Intel</span>
      <UButton icon="i-heroicons-bars-3" color="gray" variant="ghost" @click="mobileOpen = !mobileOpen" />
    </div>

    <!-- Mobile drawer -->
    <USlideover v-model="mobileOpen" side="left" class="lg:hidden">
      <nav class="p-4 space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium"
          :class="route.path.startsWith(item.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
          @click="mobileOpen = false"
        >
          <UIcon :name="item.icon" class="w-5 h-5" />
          {{ item.label }}
        </NuxtLink>
      </nav>
    </USlideover>

    <!-- Main content -->
    <div class="flex-1 lg:pl-64">
      <main class="pt-14 lg:pt-0 min-h-screen">
        <slot />
      </main>
    </div>
  </div>
</template>

<script lang="ts">
export default { setup() { const mobileOpen = ref(false); return { mobileOpen } } }
</script>
