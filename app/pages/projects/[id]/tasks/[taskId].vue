<script setup lang="ts">
import type { TaskDetailResponse, TaskHistoryEntry, TaskPriority } from '#shared/types/api'

definePageMeta({ middleware: ['role'] })

const route = useRoute()
const projectId = route.params.id as string
const taskId = route.params.taskId as string

const { data: task, pending, error } = await useFetch<TaskDetailResponse>(`/api/tasks/${taskId}`)

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  critical: 'text-rose-600 bg-rose-50 border-rose-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  medium: 'text-amber-600 bg-amber-50 border-amber-200',
  low: 'text-slate-500 bg-slate-100 border-slate-200',
}

const CONFIDENCE_LABEL: Record<string, string> = {
  completion_guaranteed: 'Completion guaranteed',
  high_probability: 'High probability',
  no_guarantee: 'No guarantee',
}

const HISTORY_ICON: Record<string, string> = {
  ai_created: 'i-heroicons-sparkles',
  ai_updated: 'i-heroicons-arrow-path',
  field_edited: 'i-heroicons-pencil-square',
  assignee_added: 'i-heroicons-user-plus',
  assignee_removed: 'i-heroicons-user-minus',
  status_changed: 'i-heroicons-arrow-right-circle',
  deadline_extended: 'i-heroicons-calendar-days',
  standup_mentioned: 'i-heroicons-microphone',
  context_learnt: 'i-heroicons-light-bulb',
}

const HISTORY_COLOR: Record<string, string> = {
  ai_created: 'bg-indigo-100 text-indigo-600',
  ai_updated: 'bg-violet-100 text-violet-600',
  field_edited: 'bg-slate-100 text-slate-600',
  assignee_added: 'bg-emerald-100 text-emerald-600',
  assignee_removed: 'bg-rose-100 text-rose-600',
  status_changed: 'bg-blue-100 text-blue-600',
  deadline_extended: 'bg-amber-100 text-amber-600',
  standup_mentioned: 'bg-gray-100 text-gray-500',
  context_learnt: 'bg-yellow-100 text-yellow-600',
}

function hoursDisplay(h: number | null | undefined): string {
  if (h == null) return '—'
  if (h >= 8) return `${h}h (${(h / 8).toFixed(1)}d)`
  return `${h}h`
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="p-6 md:p-8 max-w-5xl mx-auto">
    <UiPageHeader
      :title="task?.title ?? 'Task'"
      :breadcrumb="[
        { label: 'Projects', to: '/projects' },
        { label: 'Project', to: `/projects/${projectId}` },
        { label: task?.title ?? 'Task' },
      ]"
    />

    <div v-if="pending" class="space-y-4">
      <USkeleton v-for="i in 4" :key="i" class="h-24 rounded-2xl" />
    </div>

    <div v-else-if="error || !task" class="text-center py-20 text-slate-400">
      Task not found.
    </div>

    <div v-else class="space-y-5">

      <!-- ── Status bar ── -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-3">
        <UiStatusBadge :status="task.status" />
        <span
          v-if="task.priority"
          :class="['text-xs font-semibold px-2.5 py-1 rounded-full border capitalize', PRIORITY_COLOR[task.priority as TaskPriority]]"
        >
          {{ task.priority }}
        </span>
        <UBadge v-if="task.taskCategory" color="gray" variant="subtle" class="text-xs capitalize">
          {{ task.taskCategory.replace(/_/g, ' ') }}
        </UBadge>
        <UBadge v-if="task.complexity" color="gray" variant="subtle" class="text-xs capitalize">
          {{ task.complexity }}
        </UBadge>
        <UBadge v-if="task.isClientFacing" color="indigo" variant="subtle" class="text-xs">client-facing</UBadge>
        <UBadge v-if="task.isBlocking" color="rose" variant="subtle" class="text-xs">blocking</UBadge>
        <UBadge v-if="task.isCarriedOver" color="orange" variant="subtle" class="text-xs">carry-over</UBadge>
        <div class="ml-auto flex flex-wrap gap-1.5">
          <UBadge v-for="tag in task.tags" :key="tag" color="indigo" variant="soft" class="text-xs">#{{ tag }}</UBadge>
        </div>
      </div>

      <!-- ── Main grid ── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- Left 2/3 -->
        <div class="lg:col-span-2 space-y-5">

          <!-- Description -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Description</h2>
            <p v-if="task.description" class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {{ task.description }}
            </p>
            <p v-else class="text-sm text-slate-300 italic">No description</p>
          </div>

          <!-- Blockers / Dependencies -->
          <div
            v-if="task.blockedByDescription || task.dependsOnDescription"
            class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3"
          >
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Blockers &amp; Dependencies</h2>
            <div v-if="task.blockedByDescription" class="text-sm text-rose-700 bg-rose-50 rounded-xl px-4 py-3 flex gap-2">
              <UIcon name="i-heroicons-no-symbol" class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div><span class="font-medium">Blocked by:</span> {{ task.blockedByDescription }}</div>
            </div>
            <div v-if="task.dependsOnDescription" class="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 flex gap-2">
              <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div><span class="font-medium">Depends on:</span> {{ task.dependsOnDescription }}</div>
            </div>
          </div>

          <!-- Raw quote -->
          <div v-if="task.rawQuote" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Quote</h2>
            <blockquote class="text-sm text-slate-600 italic border-l-2 border-indigo-200 pl-4 py-1">
              "{{ task.rawQuote }}"
            </blockquote>
          </div>

          <!-- External references -->
          <div v-if="task.externalReferences?.length" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">External References</h2>
            <div class="flex flex-wrap gap-2">
              <a
                v-for="ref in task.externalReferences"
                :key="ref.ref"
                :href="ref.url ?? undefined"
                target="_blank"
                class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <UIcon name="i-heroicons-link" class="w-3.5 h-3.5" />
                <span class="font-medium">{{ ref.type.replace(/_/g, ' ') }}:</span>
                {{ ref.label }}
              </a>
            </div>
          </div>

          <!-- History timeline -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">History</h2>

            <div v-if="!task.history?.length" class="text-sm text-slate-300 italic">No history yet.</div>

            <div v-else class="space-y-1">
              <div
                v-for="(entry, idx) in task.history"
                :key="entry.id"
                class="flex gap-3"
              >
                <!-- Timeline line -->
                <div class="flex flex-col items-center">
                  <div :class="['w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', HISTORY_COLOR[entry.changeType] ?? 'bg-slate-100 text-slate-400']">
                    <UIcon :name="HISTORY_ICON[entry.changeType] ?? 'i-heroicons-circle-stack'" class="w-3.5 h-3.5" />
                  </div>
                  <div v-if="idx < task.history.length - 1" class="w-px flex-1 bg-slate-100 my-1" />
                </div>

                <!-- Entry content -->
                <div class="pb-4 flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <span class="text-xs font-semibold text-slate-700">{{ entry.actorLabel }}</span>
                      <span class="text-xs text-slate-400 ml-1.5 capitalize">
                        {{ entry.changeType.replace(/_/g, ' ') }}
                      </span>
                    </div>
                    <span class="text-xs text-slate-300 flex-shrink-0">{{ formatDateTime(entry.createdAt) }}</span>
                  </div>

                  <p v-if="entry.note" class="text-xs text-slate-600 mt-1">{{ entry.note }}</p>

                  <div v-if="entry.learntContext" class="mt-2 text-xs bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-yellow-700">
                    <p class="font-medium mb-0.5">New context learnt:</p>
                    <p class="leading-relaxed">{{ entry.learntContext }}</p>
                  </div>

                  <div
                    v-if="entry.fieldName && entry.oldValue != null && entry.newValue != null"
                    class="mt-1.5 flex items-center gap-2 text-xs font-mono"
                  >
                    <span class="text-slate-400">{{ entry.fieldName }}:</span>
                    <span class="text-rose-500 line-through">{{ JSON.stringify(entry.oldValue) }}</span>
                    <UIcon name="i-heroicons-arrow-right" class="w-3 h-3 text-slate-300" />
                    <span class="text-emerald-600">{{ JSON.stringify(entry.newValue) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right 1/3 -->
        <div class="space-y-5">

          <!-- People -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">People</h2>
            <div class="space-y-3">
              <div v-if="task.saidBy">
                <p class="text-xs text-slate-400 mb-1">Said by</p>
                <div class="flex items-center gap-2">
                  <UAvatar size="xs" />
                  <span class="text-sm font-medium text-slate-700">{{ task.saidBy.name }}</span>
                </div>
              </div>
              <div v-if="task.assignees?.length">
                <p class="text-xs text-slate-400 mb-1.5">Assigned to</p>
                <div class="space-y-1.5">
                  <div
                    v-for="assignee in task.assignees"
                    :key="assignee.id"
                    class="flex items-center gap-2"
                  >
                    <UAvatar size="xs" />
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-slate-700 truncate">{{ assignee.name }}</p>
                      <p class="text-xs text-slate-400 capitalize">{{ assignee.resourceType }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Deadline + Commitment -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deadline</h2>
            <div>
              <p v-if="task.resolvedDeadlineDate" class="text-base font-bold text-slate-800">
                {{ formatDate(task.resolvedDeadlineDate) }}
              </p>
              <p v-else class="text-sm text-slate-300">No deadline set</p>
              <p v-if="task.originalDeadlinePhrase" class="text-xs text-slate-400 mt-0.5">
                Said: "{{ task.originalDeadlinePhrase }}"
              </p>
            </div>
            <div v-if="task.timesSlipped > 0" class="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
              Slipped {{ task.timesSlipped }}x · {{ task.totalDaysSlipped }} day(s) total
            </div>
            <div v-if="task.resourceTaskCompletionConfidence">
              <p class="text-xs text-slate-400 mb-1">Commitment confidence</p>
              <p class="text-sm font-medium text-slate-700">
                {{ CONFIDENCE_LABEL[task.resourceTaskCompletionConfidence] ?? task.resourceTaskCompletionConfidence }}
              </p>
            </div>
          </div>

          <!-- Hour estimates -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimates</h2>
            <div>
              <p class="text-xs text-slate-400">Developer stated</p>
              <p class="text-sm font-bold text-slate-700 mt-0.5">{{ hoursDisplay(task.resourceEstimatedHours) }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-400">AI estimate</p>
              <p class="text-sm font-bold text-slate-700 mt-0.5">
                <template v-if="task.aiEstimatedHoursMin != null">
                  {{ hoursDisplay(task.aiEstimatedHoursMin) }} – {{ hoursDisplay(task.aiEstimatedHoursMax) }}
                  <span class="text-xs font-normal text-slate-400">({{ task.aiEstimateConfidence }})</span>
                </template>
                <span v-else class="text-slate-300">—</span>
              </p>
              <p v-if="task.aiEstimateReasoning" class="text-xs text-slate-500 mt-1 leading-relaxed">
                {{ task.aiEstimateReasoning }}
              </p>
            </div>
          </div>

          <!-- AI metadata -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-2">
            <h2 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">AI Metadata</h2>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p class="text-slate-400">Extraction confidence</p>
                <p class="font-medium text-slate-600 capitalize">{{ task.aiExtractionConfidence ?? '—' }}</p>
              </div>
              <div>
                <p class="text-slate-400">Match confidence</p>
                <p class="font-medium text-slate-600 capitalize">{{ task.aiMatchConfidence ?? '—' }}</p>
              </div>
              <div>
                <p class="text-slate-400">Mentioned in</p>
                <p class="font-medium text-slate-600">{{ task.standupMentionCount }} standup(s)</p>
              </div>
              <div>
                <p class="text-slate-400">Last mentioned</p>
                <p class="font-medium text-slate-600">{{ formatDate(task.lastMentionedAt) }}</p>
              </div>
              <div>
                <p class="text-slate-400">Target env</p>
                <p class="font-medium text-slate-600 capitalize">
                  {{ task.targetEnvironment?.replace(/_/g, ' ') ?? '—' }}
                </p>
              </div>
              <div>
                <p class="text-slate-400">Created</p>
                <p class="font-medium text-slate-600">{{ formatDate(task.createdAt) }}</p>
              </div>
            </div>
            <div v-if="task.aiMatchReasoning" class="pt-1">
              <p class="text-slate-400 text-xs">Match reasoning</p>
              <p class="text-xs text-slate-600 mt-0.5 italic">{{ task.aiMatchReasoning }}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
