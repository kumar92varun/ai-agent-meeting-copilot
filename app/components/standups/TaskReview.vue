<script setup lang="ts">
import type {
  ExtractedTask,
  TaskPriority,
  ResourceTaskCompletionConfidence,
} from '#shared/types/api'

const props = defineProps<{
  modelValue: ExtractedTask[]
  resourceList: Array<{ id: string; name: string }>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: ExtractedTask[]] }>()

function update(index: number, patch: Partial<ExtractedTask>) {
  emit('update:modelValue', props.modelValue.map((t, i) => i === index ? { ...t, ...patch } : t))
}

const resourceOptions = computed(() =>
  props.resourceList.map((r) => ({ label: r.name, value: r.id }))
)

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  critical: 'text-rose-600 bg-rose-50',
  high: 'text-orange-600 bg-orange-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-slate-500 bg-slate-100',
}

const CONFIDENCE_COLOR: Record<ResourceTaskCompletionConfidence, string> = {
  completion_guaranteed: 'text-emerald-700 bg-emerald-50',
  high_probability: 'text-blue-700 bg-blue-50',
  no_guarantee: 'text-orange-700 bg-orange-50',
}

const CONFIDENCE_LABEL: Record<ResourceTaskCompletionConfidence, string> = {
  completion_guaranteed: 'Guaranteed',
  high_probability: 'High probability',
  no_guarantee: 'No guarantee',
}

const TYPE_COLOR: Record<string, string> = {
  completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  committed: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  blocker: 'text-rose-700 bg-rose-50 border-rose-200',
}

// Chip label metadata: label + one-line description of what it means
const CHIP_META = {
  type: {
    label: 'Update type',
    desc: 'What was reported: Completed / Committed / Blocker',
  },
  priority: {
    label: 'Priority level',
    desc: 'How urgent this task is based on context',
  },
  taskCategory: {
    label: 'Task category',
    desc: 'What kind of work this is (feature, bug, testing…)',
  },
  complexity: {
    label: 'Estimated complexity',
    desc: 'AI assessment based on description',
  },
  isClientFacing: {
    label: 'Client impact',
    desc: 'Whether this task directly affects the client',
  },
  isBlocking: {
    label: 'Blocking other work',
    desc: 'This task is preventing other tasks from starting',
  },
  isCarriedOver: {
    label: 'Carry-over from previous standup',
    desc: 'This was pending and not completed before today',
  },
  existingTaskId: {
    label: 'Matched to existing task in DB',
    desc: 'AI found a matching task from a previous standup',
  },
  aiExtractionConfidence: {
    label: 'AI extraction confidence',
    desc: 'How confident AI was in reading this from the transcript',
  },
}

function hoursDisplay(h: number | null): string {
  if (h == null) return '—'
  if (h >= 8) return `${h}h (${(h / 8).toFixed(1)}d)`
  return `${h}h`
}

function toggleAssignee(index: number, resourceId: string, task: ExtractedTask) {
  const current = [task.resourceId, ...(task.additionalAssigneeIds ?? [])].filter(Boolean)
  if (current.includes(resourceId)) {
    if (current.length === 1) return
    const newAll = current.filter((id) => id !== resourceId)
    update(index, { resourceId: newAll[0], additionalAssigneeIds: newAll.slice(1) })
  } else {
    update(index, { additionalAssigneeIds: [...(task.additionalAssigneeIds ?? []), resourceId] })
  }
}

function isAssigned(task: ExtractedTask, resourceId: string) {
  return task.resourceId === resourceId || (task.additionalAssigneeIds ?? []).includes(resourceId)
}

function resourceName(id: string | null): string {
  if (!id) return 'Unknown'
  return props.resourceList.find((r) => r.id === id)?.name ?? 'Unknown'
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
      <h3 class="font-semibold text-slate-800">
        Tasks
        <span class="text-slate-400 font-normal ml-1">({{ modelValue.length }})</span>
      </h3>
    </div>

    <UiEmptyState
      v-if="!modelValue.length"
      title="No tasks extracted"
      icon="i-heroicons-clipboard-document-list"
    />

    <!-- Task cards list — slate-50 background so white cards stand out -->
    <div v-else class="bg-slate-50 p-6 space-y-8">
      <div
        v-for="(task, i) in modelValue"
        :key="i"
        class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        :class="[
          'border-l-4',
          task.type === 'completed' ? 'border-l-emerald-400' :
          task.type === 'blocker'   ? 'border-l-rose-400'    : 'border-l-indigo-400'
        ]"
      >
        <div class="p-6 space-y-5">

          <!-- ── Section: Classification chips, one row per field ── -->
          <div class="flex flex-col gap-2.5">
            <!-- Type -->
            <div class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.type.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.type.desc }}</p>
              </div>
              <span :class="['text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize', TYPE_COLOR[task.type]]">
                {{ task.type }}
              </span>
            </div>

            <!-- Priority -->
            <div v-if="task.priority" class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.priority.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.priority.desc }}</p>
              </div>
              <span :class="['text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize', PRIORITY_COLOR[task.priority as TaskPriority]]">
                {{ task.priority }}
              </span>
            </div>

            <!-- Category -->
            <div v-if="task.taskCategory" class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.taskCategory.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.taskCategory.desc }}</p>
              </div>
              <UBadge color="gray" variant="subtle" class="text-xs capitalize">
                {{ task.taskCategory.replace(/_/g, ' ') }}
              </UBadge>
            </div>

            <!-- Complexity -->
            <div v-if="task.complexity" class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.complexity.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.complexity.desc }}</p>
              </div>
              <UBadge color="gray" variant="subtle" class="text-xs capitalize">{{ task.complexity }}</UBadge>
            </div>

            <!-- Client impact -->
            <div v-if="task.isClientFacing" class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.isClientFacing.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.isClientFacing.desc }}</p>
              </div>
              <UBadge color="indigo" variant="subtle" class="text-xs">Yes — client-facing</UBadge>
            </div>

            <!-- Blocking -->
            <div v-if="task.isBlocking" class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.isBlocking.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.isBlocking.desc }}</p>
              </div>
              <UBadge color="rose" variant="subtle" class="text-xs">Yes — blocking</UBadge>
            </div>

            <!-- Carry-over -->
            <div v-if="task.isCarriedOver" class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.isCarriedOver.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.isCarriedOver.desc }}</p>
              </div>
              <UBadge color="orange" variant="subtle" class="text-xs">Yes — pending from before</UBadge>
            </div>

            <!-- Existing task match -->
            <div v-if="task.existingTaskId" class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.existingTaskId.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.existingTaskId.desc }}</p>
              </div>
              <UBadge color="violet" variant="subtle" class="text-xs">Yes — updating existing record</UBadge>
            </div>

            <!-- AI confidence -->
            <div class="flex items-center gap-4">
              <div class="w-64 flex-shrink-0">
                <p class="text-xs font-semibold text-slate-600">{{ CHIP_META.aiExtractionConfidence.label }}</p>
                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ CHIP_META.aiExtractionConfidence.desc }}</p>
              </div>
              <span class="text-xs font-medium text-slate-500 capitalize px-2.5 py-0.5 rounded-full bg-slate-100">
                {{ task.aiExtractionConfidence }}
              </span>
            </div>
          </div>

          <div class="border-t border-slate-100" />

          <!-- ── Title ── -->
          <div>
            <p class="text-xs font-semibold text-slate-500 mb-1.5">Task title</p>
            <UInput
              :model-value="task.title"
              size="sm"
              class="font-medium"
              placeholder="Task title"
              @update:model-value="update(i, { title: $event })"
            />
          </div>

          <!-- ── Description ── -->
          <div>
            <p class="text-xs font-semibold text-slate-500 mb-1.5">Description</p>
            <UTextarea
              :model-value="task.description ?? ''"
              :rows="2"
              size="sm"
              placeholder="Description…"
              @update:model-value="update(i, { description: $event || null })"
            />
          </div>

          <!-- ── Context diff for existing task ── -->
          <div
            v-if="task.existingTaskId && task.isContextUpdate && task.learntContext"
            class="rounded-xl border border-violet-100 bg-violet-50 p-3.5 space-y-1.5"
          >
            <p class="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
              <UIcon name="i-heroicons-light-bulb" class="w-3.5 h-3.5" />
              New context learnt today
            </p>
            <p class="text-xs text-violet-600 leading-relaxed">{{ task.learntContext }}</p>
            <p class="text-[11px] text-violet-400 italic">Will be appended to this task's history on save.</p>
          </div>

          <div
            v-else-if="task.existingTaskId && !task.isContextUpdate"
            class="flex items-center gap-1.5 text-xs text-slate-400"
          >
            <UIcon name="i-heroicons-link" class="w-3.5 h-3.5" />
            Matched to existing task — no new context detected today.
          </div>

          <div class="border-t border-slate-100" />

          <!-- ── Said by (read-only) + Assigned to (checkboxes) ── -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <!-- Said by — read-only -->
            <div>
              <p class="text-xs font-semibold text-slate-500 mb-0.5">Said by</p>
              <p class="text-[11px] text-slate-400 mb-2">The person who mentioned this task in the standup</p>
              <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                <UIcon name="i-heroicons-user" class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span class="text-sm text-slate-700">{{ resourceName(task.saidByResourceId) }}</span>
              </div>
            </div>

            <!-- Assigned to — checkboxes -->
            <div>
              <p class="text-xs font-semibold text-slate-500 mb-0.5">Assigned to</p>
              <p class="text-[11px] text-slate-400 mb-2">Who will do this task — tick all that apply</p>
              <div class="space-y-2">
                <label
                  v-for="opt in resourceOptions"
                  :key="opt.value"
                  class="flex items-center gap-2.5 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    :checked="isAssigned(task, opt.value)"
                    class="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 cursor-pointer"
                    @change="toggleAssignee(i, opt.value, task)"
                  />
                  <span class="text-sm text-slate-700 group-hover:text-indigo-700 transition-colors select-none">
                    {{ opt.label }}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100" />

          <!-- ── Deadline + Commitment confidence ── -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p class="text-xs font-semibold text-slate-500 mb-0.5">Deadline</p>
              <p class="text-[11px] text-slate-400 mb-2">
                <template v-if="task.originalDeadlinePhrase">
                  AI resolved "{{ task.originalDeadlinePhrase }}" to a calendar date — adjust if incorrect
                </template>
                <template v-else>No deadline phrase found in transcript</template>
              </p>
              <UInput
                :model-value="task.resolvedDeadlineDate ?? ''"
                type="date"
                size="sm"
                @update:model-value="update(i, { resolvedDeadlineDate: $event || null })"
              />
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-500 mb-0.5">Completion confidence</p>
              <p class="text-[11px] text-slate-400 mb-2">How binding was the commitment based on language used</p>
              <span
                :class="[
                  'inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg',
                  CONFIDENCE_COLOR[task.resourceTaskCompletionConfidence as ResourceTaskCompletionConfidence]
                    ?? 'text-slate-500 bg-slate-100'
                ]"
              >
                {{ CONFIDENCE_LABEL[task.resourceTaskCompletionConfidence as ResourceTaskCompletionConfidence]
                  ?? task.resourceTaskCompletionConfidence }}
              </span>
            </div>
          </div>

          <!-- ── Hours ── -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p class="text-xs font-semibold text-slate-500 mb-0.5">Developer estimate</p>
              <p class="text-[11px] text-slate-400 mb-1.5">Hours the developer explicitly stated</p>
              <p class="text-sm font-bold text-slate-700">{{ hoursDisplay(task.resourceEstimatedHours) }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-500 mb-0.5">AI estimate</p>
              <p class="text-[11px] text-slate-400 mb-1.5">Senior engineer perspective</p>
              <p class="text-sm font-bold text-slate-700">
                <template v-if="task.aiEstimatedHoursMin != null">
                  {{ hoursDisplay(task.aiEstimatedHoursMin) }} – {{ hoursDisplay(task.aiEstimatedHoursMax) }}
                  <span class="text-xs font-normal text-slate-400">({{ task.aiEstimateConfidence }})</span>
                </template>
                <span v-else class="text-slate-400 font-normal">—</span>
              </p>
            </div>
            <div v-if="task.aiEstimateReasoning">
              <p class="text-xs font-semibold text-slate-500 mb-0.5">AI reasoning</p>
              <p class="text-[11px] text-slate-400 mb-1.5">Why AI chose this estimate</p>
              <p class="text-xs text-slate-500 leading-relaxed">{{ task.aiEstimateReasoning }}</p>
            </div>
          </div>

          <!-- ── Blocked by / Depends on ── -->
          <div v-if="task.blockedByDescription || task.dependsOnDescription" class="space-y-2">
            <div v-if="task.blockedByDescription" class="text-xs text-rose-700 bg-rose-50 rounded-xl px-4 py-2.5 flex gap-2">
              <UIcon name="i-heroicons-no-symbol" class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span><strong>Blocked by:</strong> {{ task.blockedByDescription }}</span>
            </div>
            <div v-if="task.dependsOnDescription" class="text-xs text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5 flex gap-2">
              <UIcon name="i-heroicons-arrow-right" class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span><strong>Depends on:</strong> {{ task.dependsOnDescription }}</span>
            </div>
          </div>

          <!-- ── Environment + Tags + External refs ── -->
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              v-if="task.targetEnvironment && task.targetEnvironment !== 'not_specified'"
              color="gray"
              variant="outline"
              class="text-xs capitalize"
            >
              {{ task.targetEnvironment }}
            </UBadge>
            <UBadge v-for="tag in task.tags" :key="tag" color="indigo" variant="soft" class="text-xs">
              #{{ tag }}
            </UBadge>
            <a
              v-for="ref in task.externalReferences"
              :key="ref.ref"
              :href="ref.url ?? undefined"
              target="_blank"
              class="text-xs text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1"
            >
              <UIcon name="i-heroicons-link" class="w-3 h-3" />
              {{ ref.label }}
            </a>
          </div>

          <!-- ── Raw quote ── -->
          <blockquote
            v-if="task.rawQuote"
            class="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-3 py-0.5"
          >
            "{{ task.rawQuote }}"
          </blockquote>

          <!-- ── Client member links ── -->
          <div v-if="task.clientMemberLinks?.length" class="flex flex-wrap gap-2">
            <div
              v-for="link in task.clientMemberLinks"
              :key="link.clientMemberName + link.assignmentType"
              class="flex items-center gap-1.5 text-xs text-slate-500"
            >
              <UIcon name="i-heroicons-building-office" class="w-3.5 h-3.5 text-slate-400" />
              <span>{{ link.assignmentType.replace(/_/g, ' ') }}:</span>
              <UBadge color="gray" variant="subtle" class="text-xs">{{ link.clientMemberName }}</UBadge>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
