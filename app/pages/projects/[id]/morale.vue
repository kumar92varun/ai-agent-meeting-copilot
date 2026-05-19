<script setup lang="ts">
definePageMeta({ middleware: ['role'] })

const route = useRoute()
const projectId = route.params.id as string

interface MoraleRow {
  id: string
  standupId: string
  resourceId: string | null
  resourceName: string | null
  sentiment: string | null
  engagementLevel: string | null
  workloadSignal: string | null
  stressSignal: string | null
  signals: string[] | null
  overallTeamSentiment: string | null
  teamEnergy: string | null
  collaborationSignal: string | null
  tensionSignal: string | null
  aiObservation: string | null
}

interface MoraleHistory {
  standupId: string
  standupDate: string
  personSignals: MoraleRow[]
  teamSummary: MoraleRow | null
}

const { data, pending } = await useFetch<{ history: MoraleHistory[] }>(
  `/api/projects/${projectId}/morale`
)

const history = computed(() => data.value?.history ?? [])

// Collect unique resource names from all standups
const allPersons = computed(() => {
  const map = new Map<string, string>()
  for (const entry of history.value) {
    for (const p of entry.personSignals) {
      if (p.resourceId) map.set(p.resourceId, p.resourceName ?? p.resourceId)
    }
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }))
})

const SENTIMENT_DOT: Record<string, string> = {
  positive: 'bg-emerald-500',
  neutral:  'bg-slate-300',
  negative: 'bg-rose-500',
  mixed:    'bg-amber-400',
}

const STRESS_DOT: Record<string, string> = {
  none:     'bg-emerald-400',
  mild:     'bg-yellow-400',
  moderate: 'bg-orange-400',
  high:     'bg-rose-600',
}

const TEAM_ENERGY_COLOR: Record<string, string> = {
  high:   'text-emerald-600 font-semibold',
  medium: 'text-slate-500',
  low:    'text-rose-600 font-semibold',
}

const TENSION_COLOR: Record<string, string> = {
  none:    'text-emerald-600',
  mild:    'text-amber-600',
  notable: 'text-rose-600 font-semibold',
}

function personInStandup(entry: MoraleHistory, resourceId: string) {
  return entry.personSignals.find((p) => p.resourceId === resourceId) ?? null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="p-6 md:p-8 max-w-6xl mx-auto">
    <UiPageHeader
      title="Team Morale"
      subtitle="Sentiment, stress, and engagement trends extracted from standup transcripts"
      :breadcrumb="[
        { label: 'Projects', to: '/projects' },
        { label: 'Project', to: `/projects/${projectId}` },
        { label: 'Morale' },
      ]"
    />

    <div v-if="pending" class="space-y-4">
      <USkeleton v-for="i in 3" :key="i" class="h-32 rounded-2xl" />
    </div>

    <UiEmptyState
      v-else-if="!history.length"
      icon="i-heroicons-face-smile"
      title="No morale data yet"
      description="Morale signals appear here after processing standup transcripts."
    />

    <div v-else class="space-y-8">

      <!-- ── Team-level trend table ── -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100">
          <h2 class="font-semibold text-slate-800">Team overview by standup</h2>
          <p class="text-xs text-slate-400 mt-0.5">One row per standup — most recent first</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100 text-left">
                <th class="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Sentiment</th>
                <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Energy</th>
                <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Collaboration</th>
                <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tension</th>
                <th class="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">AI Observation</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="entry in history" :key="entry.standupId" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">{{ formatDate(entry.standupDate) }}</td>
                <td class="px-4 py-3">
                  <div v-if="entry.teamSummary?.overallTeamSentiment" class="flex items-center gap-2">
                    <span :class="['w-2 h-2 rounded-full flex-shrink-0', SENTIMENT_DOT[entry.teamSummary.overallTeamSentiment] ?? 'bg-slate-300']" />
                    <span class="capitalize text-slate-600">{{ entry.teamSummary.overallTeamSentiment }}</span>
                  </div>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="entry.teamSummary?.teamEnergy" :class="['capitalize', TEAM_ENERGY_COLOR[entry.teamSummary.teamEnergy] ?? 'text-slate-500']">
                    {{ entry.teamSummary.teamEnergy }}
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3">
                  <span class="capitalize text-slate-600">{{ entry.teamSummary?.collaborationSignal ?? '—' }}</span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="entry.teamSummary?.tensionSignal" :class="['capitalize', TENSION_COLOR[entry.teamSummary.tensionSignal] ?? 'text-slate-500']">
                    {{ entry.teamSummary.tensionSignal }}
                  </span>
                  <span v-else class="text-slate-300">—</span>
                </td>
                <td class="px-4 py-3 max-w-xs">
                  <p v-if="entry.teamSummary?.aiObservation" class="text-xs text-slate-500 line-clamp-2">
                    {{ entry.teamSummary.aiObservation }}
                  </p>
                  <span v-else class="text-slate-300 text-xs">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Per-person grid ── -->
      <div>
        <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Per-person signals</h2>

        <div class="space-y-6">
          <div
            v-for="person in allPersons"
            :key="person.id"
            class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <UAvatar size="sm" />
              <span class="font-semibold text-slate-800">{{ person.name }}</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-50 text-left">
                    <th class="px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</th>
                    <th class="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Sentiment</th>
                    <th class="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Engagement</th>
                    <th class="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Workload</th>
                    <th class="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Stress</th>
                    <th class="px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Observations</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <template v-for="entry in history" :key="entry.standupId">
                    <tr
                      v-if="personInStandup(entry, person.id)"
                      class="hover:bg-slate-50/50 transition-colors"
                    >
                      <td class="px-5 py-3 font-medium text-slate-700 whitespace-nowrap">{{ formatDate(entry.standupDate) }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-1.5">
                          <span :class="['w-2 h-2 rounded-full', SENTIMENT_DOT[personInStandup(entry, person.id)!.sentiment ?? ''] ?? 'bg-slate-200']" />
                          <span class="capitalize text-xs text-slate-600">{{ personInStandup(entry, person.id)!.sentiment }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 capitalize text-xs text-slate-600">
                        {{ personInStandup(entry, person.id)!.engagementLevel }}
                      </td>
                      <td class="px-4 py-3 capitalize text-xs text-slate-600">
                        {{ personInStandup(entry, person.id)!.workloadSignal }}
                      </td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-1.5">
                          <span :class="['w-2 h-2 rounded-full', STRESS_DOT[personInStandup(entry, person.id)!.stressSignal ?? ''] ?? 'bg-slate-200']" />
                          <span class="capitalize text-xs text-slate-600">{{ personInStandup(entry, person.id)!.stressSignal }}</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 max-w-xs">
                        <ul v-if="personInStandup(entry, person.id)!.signals?.length" class="space-y-0.5">
                          <li
                            v-for="(sig, idx) in personInStandup(entry, person.id)!.signals"
                            :key="idx"
                            class="text-xs text-slate-500"
                          >
                            · {{ sig }}
                          </li>
                        </ul>
                        <span v-else class="text-slate-300 text-xs">—</span>
                      </td>
                    </tr>
                    <tr v-else class="opacity-40">
                      <td class="px-5 py-2 text-xs text-slate-400">{{ formatDate(entry.standupDate) }}</td>
                      <td colspan="5" class="px-4 py-2 text-xs text-slate-300 italic">not present</td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
