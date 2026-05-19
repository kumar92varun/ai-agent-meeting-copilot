<script setup lang="ts">
import type { ExtractedMorale, MoraleSentiment, MoraleStress, MoraleEngagement, MoraleWorkload } from '#shared/types/api'

defineProps<{ morale: ExtractedMorale; resourceList: Array<{ id: string; name: string }> }>()

const SENTIMENT_COLOR: Record<MoraleSentiment, string> = {
  positive:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral:   'bg-slate-50 text-slate-600 border-slate-200',
  negative:  'bg-rose-50 text-rose-700 border-rose-200',
  mixed:     'bg-amber-50 text-amber-700 border-amber-200',
}

const STRESS_COLOR: Record<MoraleStress, string> = {
  none:     'bg-emerald-50 text-emerald-600',
  mild:     'bg-yellow-50 text-yellow-600',
  moderate: 'bg-orange-50 text-orange-600',
  high:     'bg-rose-50 text-rose-700 font-semibold',
}

const ENGAGEMENT_COLOR: Record<MoraleEngagement, string> = {
  high:   'bg-indigo-50 text-indigo-600',
  medium: 'bg-slate-100 text-slate-600',
  low:    'bg-rose-50 text-rose-600',
}

const WORKLOAD_COLOR: Record<MoraleWorkload, string> = {
  overloaded:    'bg-rose-50 text-rose-700',
  balanced:      'bg-emerald-50 text-emerald-600',
  underutilised: 'bg-amber-50 text-amber-600',
  unclear:       'bg-slate-100 text-slate-400',
}

const TEAM_ENERGY_COLOR: Record<string, string> = {
  high:   'text-emerald-600',
  medium: 'text-slate-500',
  low:    'text-rose-600',
}

function resourceName(id: string, list: Array<{ id: string; name: string }>) {
  return list.find((r) => r.id === id)?.name ?? 'Unknown'
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div class="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
      <h3 class="font-semibold text-slate-800">
        Team Morale Signals
        <span class="text-slate-400 font-normal ml-1">({{ morale.personSignals.length }} members)</span>
      </h3>
    </div>

    <div class="bg-slate-50 p-6 space-y-5">
      <!-- Per-person cards -->
      <div
        v-for="person in morale.personSignals"
        :key="person.resourceId"
        class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4"
      >
        <!-- Header: name + sentiment -->
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <UAvatar size="sm" />
            <span class="font-semibold text-slate-800">{{ resourceName(person.resourceId, resourceList) }}</span>
          </div>
          <span :class="['text-xs font-semibold px-3 py-1 rounded-full border capitalize', SENTIMENT_COLOR[person.sentiment]]">
            {{ person.sentiment }} sentiment
          </span>
        </div>

        <!-- Signal chips row -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <p class="text-[11px] text-slate-400 mb-1">Engagement</p>
            <span :class="['text-xs font-medium px-2.5 py-1 rounded-lg capitalize', ENGAGEMENT_COLOR[person.engagementLevel]]">
              {{ person.engagementLevel }}
            </span>
          </div>
          <div>
            <p class="text-[11px] text-slate-400 mb-1">Workload</p>
            <span :class="['text-xs font-medium px-2.5 py-1 rounded-lg capitalize', WORKLOAD_COLOR[person.workloadSignal]]">
              {{ person.workloadSignal }}
            </span>
          </div>
          <div>
            <p class="text-[11px] text-slate-400 mb-1">Stress signal</p>
            <span :class="['text-xs px-2.5 py-1 rounded-lg capitalize', STRESS_COLOR[person.stressSignal]]">
              {{ person.stressSignal }}
            </span>
          </div>
        </div>

        <!-- Specific observations -->
        <div v-if="person.signals?.length" class="space-y-1">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Observations</p>
          <ul class="space-y-1">
            <li
              v-for="(sig, idx) in person.signals"
              :key="idx"
              class="flex items-start gap-2 text-xs text-slate-600"
            >
              <UIcon name="i-heroicons-chevron-right" class="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
              {{ sig }}
            </li>
          </ul>
        </div>

        <!-- Raw quotes -->
        <div v-if="person.rawQuotes?.length" class="space-y-1">
          <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Source quotes</p>
          <div class="flex flex-col gap-1">
            <blockquote
              v-for="(q, idx) in person.rawQuotes"
              :key="idx"
              class="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-3 py-0.5"
            >
              "{{ q }}"
            </blockquote>
          </div>
        </div>
      </div>

      <!-- Team summary card -->
      <div class="bg-white rounded-xl border border-indigo-100 shadow-sm p-5 space-y-4">
        <p class="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Team-level summary</p>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p class="text-[11px] text-slate-400 mb-1">Overall sentiment</p>
            <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full border capitalize', SENTIMENT_COLOR[morale.teamSummary.overallTeamSentiment]]">
              {{ morale.teamSummary.overallTeamSentiment }}
            </span>
          </div>
          <div>
            <p class="text-[11px] text-slate-400 mb-1">Team energy</p>
            <span :class="['text-sm font-bold capitalize', TEAM_ENERGY_COLOR[morale.teamSummary.teamEnergy]]">
              {{ morale.teamSummary.teamEnergy }}
            </span>
          </div>
          <div>
            <p class="text-[11px] text-slate-400 mb-1">Collaboration</p>
            <span class="text-xs font-medium text-slate-600 capitalize">{{ morale.teamSummary.collaborationSignal }}</span>
          </div>
          <div>
            <p class="text-[11px] text-slate-400 mb-1">Tension detected</p>
            <span
              :class="[
                'text-xs font-medium capitalize',
                morale.teamSummary.tensionSignal === 'notable' ? 'text-rose-600 font-semibold' :
                morale.teamSummary.tensionSignal === 'mild' ? 'text-amber-600' : 'text-emerald-600'
              ]"
            >
              {{ morale.teamSummary.tensionSignal }}
            </span>
          </div>
        </div>

        <div v-if="morale.teamSummary.aiObservation" class="bg-indigo-50 rounded-xl px-4 py-3">
          <p class="text-[11px] font-semibold text-indigo-500 mb-1">AI Observation</p>
          <p class="text-xs text-indigo-700 leading-relaxed">{{ morale.teamSummary.aiObservation }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
