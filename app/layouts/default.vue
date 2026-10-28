<script setup lang="ts">
const { user } = useUserSession()
const route = useRoute()
const authDisabled = useRuntimeConfig().public.authDisabled

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

function logout() {
  window.location.href = appUrl('/api/auth/logout')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Sidebar (desktop) -->
    <aside class="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200/80 fixed inset-y-0 z-30">
      <!-- Logo -->
      <div class="flex items-center h-16 px-5 border-b border-slate-100">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <UIcon name="i-heroicons-cpu-chip" class="w-4.5 h-4.5 text-white" />
          </div>
          <span class="text-[15px] font-semibold text-slate-800 tracking-tight">Standup Intel</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          :class="route.path.startsWith(item.to)
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'"
        >
          <div
            class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            :class="route.path.startsWith(item.to)
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'"
          >
            <UIcon :name="item.icon" class="w-4 h-4" />
          </div>
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- User -->
      <div class="p-3 border-t border-slate-100">
        <div class="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
          <UAvatar :src="(user as { avatarUrl?: string })?.avatarUrl || undefined" size="sm" class="ring-2 ring-slate-100" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-700 truncate">{{ (user as { name?: string })?.name }}</p>
            <p class="text-xs text-slate-400 truncate capitalize">{{ (user as { role?: string })?.role?.replace('_', ' ') }}</p>
          </div>
          <UButton
            v-if="!authDisabled"
            icon="i-heroicons-arrow-right-on-rectangle"
            color="gray"
            variant="ghost"
            size="xs"
            class="text-slate-400 hover:text-slate-600"
            @click="logout"
          />
        </div>
      </div>
    </aside>

    <!-- Mobile top bar -->
    <div class="lg:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-4">
      <div class="flex items-center gap-2 flex-1">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <UIcon name="i-heroicons-cpu-chip" class="w-3.5 h-3.5 text-white" />
        </div>
        <span class="text-base font-semibold text-slate-800">Standup Intel</span>
      </div>
      <UButton icon="i-heroicons-bars-3" color="gray" variant="ghost" @click="mobileOpen = !mobileOpen" />
    </div>

    <!-- Mobile drawer -->
    <USlideover v-model="mobileOpen" side="left" class="lg:hidden">
      <nav class="p-3 space-y-0.5">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
          :class="route.path.startsWith(item.to) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'"
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
