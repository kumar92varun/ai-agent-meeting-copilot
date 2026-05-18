<script setup lang="ts">
import type { Project } from '#shared/types/domain'
import type { AttendanceRow, ExtractedTask, ExtractedRisk, IdentifiedClientMember } from '#shared/types/api'

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

// SSE analysis state
const progressNodes = ref<string[]>([])
const analysisError = ref('')
const rawExtraction = ref<Record<string, unknown> | null>(null)

// Editable review state — typed properly
const reviewAttendance = ref<AttendanceRow[]>([])
const reviewTasks = ref<ExtractedTask[]>([])
const reviewRisks = ref<ExtractedRisk[]>([])
const reviewClientMembers = ref<IdentifiedClientMember[]>([])

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
    response = await fetch('/api/standups/analyze', {
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
  // Buffer partial lines across chunks
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last (potentially incomplete) line in the buffer
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
            // Only move to review if at least some data came back
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
</script>

<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto">
    <UiPageHeader
      title="New Standup"
      subtitle="Paste transcript, analyze, review, and save"
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
    <div v-else-if="step === 'review'" class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-800">Review Extraction</h2>
        <div class="flex gap-2">
          <UButton color="gray" variant="outline" size="sm" @click="step = 'input'">Re-analyze</UButton>
          <UButton size="sm" @click="save">Save Standup</UButton>
        </div>
      </div>

      <StandupsAttendanceReview v-model="reviewAttendance" />
      <StandupsClientMembersReview :members="reviewClientMembers" />
      <StandupsTaskReview v-model="reviewTasks" />
      <StandupsRiskReview :risks="reviewRisks" />
    </div>

    <!-- Step: Saving -->
    <div v-else-if="step === 'saving'" class="text-center py-16">
      <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p class="text-gray-500">Saving standup…</p>
    </div>
  </div>
</template>
