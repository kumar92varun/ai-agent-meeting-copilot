<script setup lang="ts">
import type { Project } from '#shared/types/domain'
definePageMeta({ middleware: ['role'] })

const route = useRoute()
const toast = useToast()

// Step: 'input' | 'analyzing' | 'review' | 'saving' | 'done'
const step = ref<'input' | 'analyzing' | 'review' | 'saving' | 'done'>('input')

const { data: projects } = await useFetch<Project[]>('/api/projects')

const form = reactive({
  projectId: (route.query.projectId as string) || '',
  standupDate: new Date().toISOString().slice(0, 10),
  transcript: '',
})

// Analysis state
const progressNodes: Ref<string[]> = ref([])
const extraction = ref<Record<string, unknown> | null>(null)
const analysisError = ref('')

interface ReviewTask {
  title: string
  commitmentConfidence: string | null
  isCompleted: boolean
  resolvedDeadlineDate: string | null
  originalDeadlinePhrase: string | null
  resourceEstimatedHours: number | null
  aiEstimatedHoursMin: number | null
  aiEstimatedHoursMax: number | null
  aiEstimateConfidence: string | null
  rawQuote: string | null
  [key: string]: unknown
}

interface ReviewRisk {
  severity: string
  category: string
  title: string
  description: string
  sourceRawQuote: string | null
  [key: string]: unknown
}

// Editable review state
const reviewAttendance: Ref<Array<{ resourceId: string; resourceName: string; attended: boolean }>> = ref([])
const reviewTasks: Ref<ReviewTask[]> = ref([])
const reviewRisks: Ref<ReviewRisk[]> = ref([])

const NODE_LABELS: Record<string, string> = {
  'parse-transcript': 'Parsing transcript',
  'infer-attendance': 'Inferring attendance',
  'extract-tasks': 'Extracting tasks',
  'match-existing-tasks': 'Matching existing tasks',
  'resolve-deadlines': 'Resolving deadlines',
  'estimate-hours': 'Estimating hours',
  'detect-risks': 'Detecting risks',
}

const allNodes = Object.keys(NODE_LABELS)

async function analyze() {
  if (!form.projectId || !form.transcript.trim()) {
    toast.add({ title: 'Please fill all fields', color: 'red' })
    return
  }

  step.value = 'analyzing'
  progressNodes.value = []
  analysisError.value = ''

  const response = await fetch('/api/standups/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6))

        if (event.type === 'progress' && event.node) {
          progressNodes.value.push(event.node)
        } else if (event.type === 'result' && event.data) {
          extraction.value = event.data
          reviewAttendance.value = event.data.attendance || []
          reviewTasks.value = event.data.tasks || []
          reviewRisks.value = event.data.risks || []
          step.value = 'review'
        } else if (event.type === 'error') {
          analysisError.value = event.error || 'Unknown error'
        }
      } catch {}
    }
  }

  if (step.value === 'analyzing') {
    analysisError.value = analysisError.value || 'Analysis incomplete'
  }
}

async function save() {
  step.value = 'saving'
  try {
    const { id } = await $fetch<{ id: string }>('/api/standups', {
      method: 'POST',
      body: {
        projectId: form.projectId,
        standupDate: form.standupDate,
        rawTranscript: form.transcript,
        extraction: {
          ...extraction.value,
          attendance: reviewAttendance.value,
          tasks: reviewTasks.value,
          risks: reviewRisks.value,
        },
      },
    })
    step.value = 'done'
    toast.add({ title: 'Standup saved', color: 'green' })
    navigateTo(`/standups/${id}`)
  } catch (err) {
    toast.add({ title: 'Save failed', color: 'red' })
    step.value = 'review'
  }
}

const projectOptions = computed(() =>
  (projects.value || []).map((p) => ({ label: p.name, value: p.id }))
)
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">New Standup</h1>
    <p class="text-sm text-gray-500 mb-8">Paste transcript, analyze, review, and save</p>

    <!-- Step 1: Input -->
    <div v-if="step === 'input'" class="space-y-6">
      <UFormGroup label="Project" required>
        <USelect v-model="form.projectId" :options="projectOptions" placeholder="Select a project" />
      </UFormGroup>

      <UFormGroup label="Standup Date" required>
        <UInput v-model="form.standupDate" type="date" />
      </UFormGroup>

      <UFormGroup label="Transcript" required hint="Paste raw standup transcript. Hinglish (Hindi+English) is fully supported.">
        <UTextarea
          v-model="form.transcript"
          :rows="16"
          placeholder="Paste standup transcript here…&#10;&#10;Example:&#10;Varun: Kal maine API integration complete ki. Aaj OAuth flow pe kaam karunga, kal tak ho jayega.&#10;Priya: Dashboard ka UI almost done hai, bas testing baki hai."
          class="font-mono text-sm"
        />
      </UFormGroup>

      <div class="flex justify-end">
        <UButton size="lg" @click="analyze" :disabled="!form.projectId || !form.transcript.trim()">
          Analyze Transcript
          <template #trailing>
            <UIcon name="i-heroicons-sparkles" class="w-4 h-4" />
          </template>
        </UButton>
      </div>
    </div>

    <!-- Step 2: Analyzing (SSE progress) -->
    <div v-else-if="step === 'analyzing'" class="space-y-4">
      <UCard>
        <h2 class="font-semibold text-gray-800 mb-4">Analyzing transcript…</h2>
        <ul class="space-y-3">
          <li v-for="node in allNodes" :key="node" class="flex items-center gap-3">
            <div class="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <UIcon
                v-if="progressNodes.includes(node)"
                name="i-heroicons-check-circle"
                class="w-5 h-5 text-green-500"
              />
              <div
                v-else-if="progressNodes.length > 0 && allNodes.indexOf(node) === progressNodes.length"
                class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
              />
              <div v-else class="w-4 h-4 rounded-full border-2 border-gray-200" />
            </div>
            <span :class="progressNodes.includes(node) ? 'text-gray-800' : 'text-gray-400'" class="text-sm">
              {{ NODE_LABELS[node] }}
            </span>
          </li>
        </ul>

        <UAlert v-if="analysisError" color="red" variant="soft" class="mt-4">
          {{ analysisError }}
          <UButton size="xs" color="red" variant="outline" class="mt-2" @click="step = 'input'">
            Try again
          </UButton>
        </UAlert>
      </UCard>
    </div>

    <!-- Step 3: Review -->
    <div v-else-if="step === 'review'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">Review Extraction</h2>
        <div class="flex gap-2">
          <UButton color="gray" variant="outline" size="sm" @click="step = 'input'">Re-analyze</UButton>
          <UButton size="sm" @click="save">Save Standup</UButton>
        </div>
      </div>

      <!-- Attendance -->
      <UCard>
        <h3 class="font-semibold text-gray-800 mb-4">Attendance</h3>
        <ul class="space-y-2">
          <li v-for="(att, i) in reviewAttendance" :key="att.resourceId" class="flex items-center justify-between">
            <span class="text-sm text-gray-700">{{ att.resourceName }}</span>
            <div class="flex items-center gap-2">
              <UToggle v-model="reviewAttendance[i].attended" />
            </div>
          </li>
        </ul>
      </UCard>

      <!-- Tasks -->
      <UCard>
        <h3 class="font-semibold text-gray-800 mb-4">Tasks ({{ reviewTasks.length }})</h3>
        <div v-if="reviewTasks.length" class="space-y-4">
          <div v-for="(task, i) in reviewTasks" :key="i" class="border border-gray-200 rounded-lg p-4 space-y-3">
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <UInput v-model="reviewTasks[i].title" size="sm" placeholder="Task title" />
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <UBadge
                  :color="task.commitmentConfidence === 'firm' ? 'green' : task.commitmentConfidence === 'vague' ? 'yellow' : 'orange'"
                  variant="subtle"
                  class="text-xs"
                >
                  {{ task.commitmentConfidence }}
                </UBadge>
                <UBadge v-if="task.isCompleted" color="green" variant="subtle" class="text-xs">done</UBadge>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <span v-if="task.resolvedDeadlineDate">Due: {{ task.resolvedDeadlineDate }}</span>
              <span v-if="task.originalDeadlinePhrase">Original: "{{ task.originalDeadlinePhrase }}"</span>
              <span v-if="task.resourceEstimatedHours">Dev estimate: {{ task.resourceEstimatedHours }}h</span>
              <span v-if="task.aiEstimatedHoursMin">AI estimate: {{ task.aiEstimatedHoursMin }}–{{ task.aiEstimatedHoursMax }}h ({{ task.aiEstimateConfidence }})</span>
            </div>
            <blockquote v-if="task.rawQuote" class="text-xs text-gray-500 border-l-2 border-gray-200 pl-2 italic">
              "{{ task.rawQuote }}"
            </blockquote>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No tasks extracted.</p>
      </UCard>

      <!-- Risks -->
      <UCard>
        <h3 class="font-semibold text-gray-800 mb-4">Detected Risks ({{ reviewRisks.length }})</h3>
        <div v-if="reviewRisks.length" class="space-y-3">
          <div
            v-for="(risk, i) in reviewRisks"
            :key="i"
            class="border border-red-100 bg-red-50 rounded-lg p-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <UBadge :color="risk.severity === 'critical' ? 'red' : risk.severity === 'high' ? 'orange' : 'yellow'" variant="subtle" class="text-xs uppercase">
                    {{ risk.severity }}
                  </UBadge>
                  <span class="text-xs text-gray-500">{{ String(risk.category).replace(/_/g, ' ') }}</span>
                </div>
                <p class="font-medium text-sm text-gray-800">{{ risk.title }}</p>
                <p class="text-xs text-gray-600 mt-0.5">{{ risk.description }}</p>
                <blockquote v-if="risk.sourceRawQuote" class="text-xs text-gray-500 border-l-2 border-red-200 pl-2 italic mt-1">
                  "{{ risk.sourceRawQuote }}"
                </blockquote>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-400">No risks detected.</p>
      </UCard>
    </div>

    <!-- Saving -->
    <div v-else-if="step === 'saving'" class="text-center py-16">
      <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p class="text-gray-500">Saving standup…</p>
    </div>
  </div>
</template>
