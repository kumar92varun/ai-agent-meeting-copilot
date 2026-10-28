<script setup lang="ts">
import type { Project } from '#shared/types/domain'
import type { AttendanceRow, ExtractedTask, ExtractedRisk, IdentifiedClientMember, ExtractedMorale } from '#shared/types/api'

interface ResourceItem { id: string; name: string; resourceType: string }

definePageMeta({ middleware: ['role'] })

const route = useRoute()
const toast = useToast()

type Step = 'input' | 'analyzing' | 'review' | 'saving' | 'done'
const step = ref<Step>('input')

const { data: projects } = await useFetch<Project[]>('/api/projects')

const form = reactive({
  projectId: (route.query.projectId as string) || '',
  standupDate: new Date().toISOString().slice(0, 10),
  transcript: '',
})

// Loaded when a project is selected — for the assignee dropdowns in TaskReview
const projectResources = ref<ResourceItem[]>([])
watch(() => form.projectId, async (id) => {
  if (!id) return
  projectResources.value = await $fetch<ResourceItem[]>(`/api/projects/${id}/resources`).catch(() => [])
}, { immediate: true })

// SSE analysis state
const progressNodes = ref<string[]>([])
const analysisError = ref('')
const rawExtraction = ref<Record<string, unknown> | null>(null)

// Editable review state
const reviewAttendance = ref<AttendanceRow[]>([])
const reviewTasks = ref<ExtractedTask[]>([])
const reviewRisks = ref<ExtractedRisk[]>([])
const reviewClientMembers = ref<IdentifiedClientMember[]>([])
const reviewMorale = ref<ExtractedMorale | null>(null)

async function analyze() {
  if (!form.projectId || !form.transcript.trim()) {
    toast.add({ title: 'Please fill all fields', color: 'red' })
    return
  }

  step.value = 'analyzing'
  progressNodes.value = []
  analysisError.value = ''

  let response: Response
  try {
    response = await fetch(appUrl('/api/standups/analyze'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form }),
    })
  } catch (err) {
    analysisError.value = 'Network error — could not reach the server'
    return
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}))
    analysisError.value = (errBody as { message?: string }).message ?? `Server error ${response.status}`
    return
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === 'progress' && event.node) {
            progressNodes.value.push(event.node)
          } else if (event.type === 'result' && event.data) {
            rawExtraction.value = event.data
            reviewAttendance.value = event.data.attendance ?? []
            reviewTasks.value = event.data.tasks ?? []
            reviewRisks.value = event.data.risks ?? []
            reviewClientMembers.value = event.data.identifiedClientMembers ?? []
            reviewMorale.value = event.data.morale ?? null
            if (
              reviewAttendance.value.length > 0 ||
              reviewTasks.value.length > 0 ||
              reviewRisks.value.length > 0
            ) {
              step.value = 'review'
            } else {
              analysisError.value = analysisError.value || 'Extraction returned no data — check server logs for LLM errors'
            }
          } else if (event.type === 'error') {
            analysisError.value = event.error ?? 'Analysis error'
          }
        } catch {}
      }
    }
  } catch (err) {
    analysisError.value = 'Lost connection while reading analysis stream'
  }

  if (step.value === 'analyzing') {
    analysisError.value = analysisError.value || 'Analysis incomplete — try again'
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
          ...rawExtraction.value,
          attendance: reviewAttendance.value,
          tasks: reviewTasks.value,
          risks: reviewRisks.value,
          identifiedClientMembers: reviewClientMembers.value,
          morale: reviewMorale.value ?? { personSignals: [], teamSummary: { overallTeamSentiment: 'neutral', teamEnergy: 'medium', collaborationSignal: 'neutral', tensionSignal: 'none', aiObservation: '' } },
        },
      },
    })
    toast.add({ title: 'Standup saved', color: 'green' })
    navigateTo(`/standups/${id}`)
  } catch {
    toast.add({ title: 'Save failed', color: 'red' })
    step.value = 'review'
  }
}

const projectOptions = computed(() =>
  (projects.value ?? []).map((p) => ({ label: p.name, value: p.id }))
)

const findingsSummary = computed(() => {
  const parts = []
  if (reviewAttendance.value.length) parts.push(`${reviewAttendance.value.length} members`)
  if (reviewTasks.value.length) parts.push(`${reviewTasks.value.length} tasks`)
  if (reviewRisks.value.length) parts.push(`${reviewRisks.value.length} risk${reviewRisks.value.length !== 1 ? 's' : ''}`)
  if (reviewClientMembers.value.length) parts.push(`${reviewClientMembers.value.length} client member${reviewClientMembers.value.length !== 1 ? 's' : ''}`)
  return parts.join(' · ')
})
</script>

<template>
  <div class="p-6 md:p-8 max-w-4xl mx-auto">
    <UiPageHeader
      title="New Standup"
      subtitle="Paste transcript, analyze, review, then confirm to save"
    />

    <!-- Step 1: Input -->
    <div v-if="step === 'input'" class="space-y-6">
      <UFormGroup label="Project" required>
        <USelect v-model="form.projectId" :options="projectOptions" placeholder="Select a project" />
      </UFormGroup>

      <UFormGroup label="Standup Date" required>
        <UInput v-model="form.standupDate" type="date" />
      </UFormGroup>

      <UFormGroup
        label="Transcript"
        required
        hint="Paste raw standup transcript. Hinglish (Hindi+English) and Fathom transcripts are fully supported."
      >
        <UTextarea
          v-model="form.transcript"
          :rows="16"
          placeholder="Paste standup transcript here…"
          class="font-mono text-sm"
        />
      </UFormGroup>

      <div class="flex justify-end">
        <UButton
          size="lg"
          :disabled="!form.projectId || !form.transcript.trim()"
          @click="analyze"
        >
          Analyze Transcript
          <template #trailing>
            <UIcon name="i-heroicons-sparkles" class="w-4 h-4" />
          </template>
        </UButton>
      </div>
    </div>

    <!-- Step 2: Analyzing (SSE progress) -->
    <div v-else-if="step === 'analyzing'">
      <StandupsAnalysisProgress :completed-nodes="progressNodes" :error="analysisError" />
    </div>

    <!-- Step 3: Review -->
    <div v-else-if="step === 'review'" class="space-y-5 pb-36">
      <!-- Section header — no save button here -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">Review AI Findings</h2>
          <p class="text-sm text-slate-400 mt-0.5">Check everything below before confirming. You can edit task titles inline.</p>
        </div>
        <UButton color="gray" variant="outline" size="sm" @click="step = 'input'">
          <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5 mr-1.5" />
          Re-analyze
        </UButton>
      </div>

      <StandupsAttendanceReview v-model="reviewAttendance" />
      <StandupsClientMembersReview :members="reviewClientMembers" />
      <StandupsTaskReview v-model="reviewTasks" :resource-list="projectResources" />
      <StandupsRiskReview :risks="reviewRisks" />
      <StandupsMoraleReview v-if="reviewMorale" :morale="reviewMorale" :resource-list="projectResources" />

      <!-- Sticky bottom confirmation bar -->
      <div class="fixed bottom-0 left-0 right-0 lg:left-64 z-20 bg-white/90 backdrop-blur border-t border-slate-200 shadow-lg">
        <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-slate-700">Ready to save?</p>
            <p class="text-xs text-slate-400 mt-0.5">{{ findingsSummary }} will be written to the database.</p>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <UButton color="gray" variant="outline" size="sm" @click="step = 'input'">
              Discard
            </UButton>
            <UButton size="md" @click="save">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-1.5" />
              Confirm & Save
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Step: Saving -->
    <div v-else-if="step === 'saving'" class="text-center py-20">
      <div class="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p class="text-slate-500 font-medium">Saving standup…</p>
      <p class="text-xs text-slate-400 mt-1">Writing findings to the database</p>
    </div>
  </div>
</template>
