<script setup lang="ts">
definePageMeta({ middleware: ['role'] })

interface StandupAttendance {
  id: string
  resourceId: string
  resourceName: string
  resourceType: string
  attended: boolean
  completedYesterdaySummary: string | null
  workingTodaySummary: string | null
}

interface StandupTask {
  id: string
  title: string
  description: string | null
  status: string
  resourceId: string
  resourceName: string
  resolvedDeadlineDate: string | null
  commitmentConfidence: string | null
  aiEstimatedHoursMin: number | null
  aiEstimatedHoursMax: number | null
  aiEstimateConfidence: string | null
}

interface StandupRisk {
  id: string
  riskType: string
  category: string
  severity: string
  title: string
  description: string
  aiReasoning: string
  sourceRawQuote: string | null
  status: string
}

interface StandupClientMember {
  id: string
  name: string
  inferredRole: string | null
}

interface StandupDetail {
  id: string
  projectId: string
  standupDate: string
  rawTranscript: string
  extractionStatus: string
  llmModelUsed: string | null
  tokensIn: number | null
  tokensOut: number | null
  processingDurationMs: number | null
  createdAt: string
  updates: StandupAttendance[]
  tasks: StandupTask[]
  risks: StandupRisk[]
  clientMembers: StandupClientMember[]
}

const route = useRoute()
const { data: standup } = await useFetch<StandupDetail>(`/api/standups/${route.params.id}`)

const STATUS_COLOR: Record<string, 'green' | 'red' | 'gray' | 'yellow' | 'blue'> = {
  committed: 'blue',
  in_progress: 'yellow',
  completed: 'green',
  overdue: 'red',
  carried_over: 'orange' as 'red',
  cancelled: 'gray',
}

const visibleRisks = computed(() =>
  (standup.value?.risks ?? []).filter((r) => r.title !== 'No risks detected')
)
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-500 mb-4">
      <NuxtLink :to="`/projects/${standup?.projectId}`" class="hover:text-blue-600">Project</NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
      <span>Standup {{ standup?.standupDate }}</span>
    </div>

    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ standup?.standupDate }}</h1>
        <p class="text-sm text-gray-400 mt-0.5">
          {{ standup?.llmModelUsed }}
          <span v-if="standup?.processingDurationMs"> · {{ standup.processingDurationMs }}ms</span>
          <span v-if="standup?.tokensIn"> · {{ standup.tokensIn }}↑ {{ standup.tokensOut }}↓ tokens</span>
        </p>
      </div>
      <UBadge :color="standup?.extractionStatus === 'saved' ? 'green' : 'gray'" variant="subtle">
        {{ standup?.extractionStatus }}
      </UBadge>
    </div>

    <!-- Attendance -->
    <UCard class="mb-6">
      <h2 class="font-semibold text-gray-800 mb-4">Attendance</h2>
      <ul class="divide-y divide-gray-100">
        <li
          v-for="update in standup?.updates"
          :key="update.id"
          class="flex items-center justify-between py-2.5"
        >
          <div class="flex items-center gap-2">
            <UAvatar :alt="update.resourceName" size="xs" />
            <div>
              <span class="text-sm font-medium text-gray-800">{{ update.resourceName }}</span>
              <span class="ml-1.5 text-xs text-gray-400 capitalize">{{ update.resourceType }}</span>
            </div>
          </div>
          <UBadge :color="update.attended ? 'green' : 'red'" variant="subtle">
            {{ update.attended ? 'Present' : 'Absent' }}
          </UBadge>
        </li>
      </ul>
      <UiEmptyState
        v-if="!standup?.updates?.length"
        icon="i-heroicons-users"
        title="No attendance data"
      />
    </UCard>

    <!-- Client Team Members (if any new ones were identified) -->
    <UCard v-if="standup?.clientMembers?.length" class="mb-6">
      <h2 class="font-semibold text-gray-800 mb-4">
        New Client Team Members
        <UBadge color="blue" variant="subtle" class="ml-2">{{ standup.clientMembers.length }}</UBadge>
      </h2>
      <ul class="space-y-2">
        <li
          v-for="member in standup.clientMembers"
          :key="member.id"
          class="flex items-center gap-2 text-sm"
        >
          <UIcon name="i-heroicons-building-office" class="w-4 h-4 text-blue-400" />
          <span class="font-medium text-gray-800">{{ member.name }}</span>
          <span v-if="member.inferredRole" class="text-gray-500">· {{ member.inferredRole }}</span>
        </li>
      </ul>
    </UCard>

    <!-- Tasks -->
    <UCard class="mb-6">
      <h2 class="font-semibold text-gray-800 mb-4">
        Tasks Introduced
        <span class="text-gray-400 font-normal ml-1">({{ standup?.tasks?.length ?? 0 }})</span>
      </h2>
      <div v-if="standup?.tasks?.length" class="space-y-3">
        <div
          v-for="task in standup.tasks"
          :key="task.id"
          class="border border-gray-200 rounded-lg p-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ task.title }}</p>
              <p v-if="task.description" class="text-xs text-gray-500 mt-0.5">{{ task.description }}</p>
            </div>
            <UiStatusBadge :status="task.status" />
          </div>
          <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-user" class="w-3 h-3" />
              {{ task.resourceName }}
            </span>
            <span v-if="task.resolvedDeadlineDate">Due {{ task.resolvedDeadlineDate }}</span>
            <span v-if="task.aiEstimatedHoursMin">
              AI est: {{ task.aiEstimatedHoursMin }}–{{ task.aiEstimatedHoursMax }}h
            </span>
            <UBadge
              v-if="task.commitmentConfidence"
              :color="task.commitmentConfidence === 'firm' ? 'green' : task.commitmentConfidence === 'vague' ? 'yellow' : 'orange'"
              variant="subtle"
              class="text-xs"
            >
              {{ task.commitmentConfidence }}
            </UBadge>
          </div>
        </div>
      </div>
      <UiEmptyState
        v-else
        icon="i-heroicons-clipboard-document-list"
        title="No new tasks introduced in this standup"
      />
    </UCard>

    <!-- Risks -->
    <UCard class="mb-6">
      <h2 class="font-semibold text-gray-800 mb-4">
        Risks Detected
        <span class="text-gray-400 font-normal ml-1">({{ visibleRisks.length }})</span>
      </h2>
      <div v-if="visibleRisks.length" class="space-y-3">
        <div
          v-for="risk in visibleRisks"
          :key="risk.id"
          class="border border-red-100 bg-red-50 rounded-lg p-3"
        >
          <div class="flex items-start gap-3">
            <UiSeverityBadge :severity="risk.severity" class="flex-shrink-0 mt-0.5" />
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-500 mb-0.5">{{ risk.category.replace(/_/g, ' ') }}</p>
              <p class="text-sm font-medium text-gray-900">{{ risk.title }}</p>
              <p class="text-xs text-gray-600 mt-0.5">{{ risk.description }}</p>
              <blockquote
                v-if="risk.sourceRawQuote"
                class="mt-2 text-xs text-gray-500 italic border-l-2 border-red-200 pl-2"
              >
                "{{ risk.sourceRawQuote }}"
              </blockquote>
            </div>
            <UiStatusBadge :status="risk.status" />
          </div>
        </div>
      </div>
      <UiEmptyState
        v-else
        icon="i-heroicons-check-circle"
        title="No risks detected"
        description="Clean standup — nothing flagged."
      />
    </UCard>

    <!-- Raw Transcript (collapsed) -->
    <UCard>
      <UAccordion
        :items="[{ label: 'Raw Transcript', slot: 'transcript' }]"
        variant="ghost"
      >
        <template #transcript>
          <pre class="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded p-4 max-h-96 overflow-auto mt-2">{{ standup?.rawTranscript }}</pre>
        </template>
      </UAccordion>
    </UCard>
  </div>
</template>
