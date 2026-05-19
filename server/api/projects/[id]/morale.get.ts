import { getDb } from '../../../db/client'
import { standupMoraleSignals, standups } from '../../../db/schema'
import { and, eq, isNull, desc, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await getUserSession(event)
  const projectId = getRouterParam(event, 'id')
  if (!projectId) throw createError({ statusCode: 400, message: 'Project ID required' })

  const db = getDb()

  // Fetch morale rows joined with standup date, last 20 standups
  const rows = await db
    .select({
      id: standupMoraleSignals.id,
      standupId: standupMoraleSignals.standupId,
      standupDate: standups.standupDate,
      resourceId: standupMoraleSignals.resourceId,
      resourceName: standupMoraleSignals.resourceName,
      sentiment: standupMoraleSignals.sentiment,
      engagementLevel: standupMoraleSignals.engagementLevel,
      workloadSignal: standupMoraleSignals.workloadSignal,
      stressSignal: standupMoraleSignals.stressSignal,
      signals: standupMoraleSignals.signals,
      rawQuotes: standupMoraleSignals.rawQuotes,
      overallTeamSentiment: standupMoraleSignals.overallTeamSentiment,
      teamEnergy: standupMoraleSignals.teamEnergy,
      collaborationSignal: standupMoraleSignals.collaborationSignal,
      tensionSignal: standupMoraleSignals.tensionSignal,
      aiObservation: standupMoraleSignals.aiObservation,
      createdAt: standupMoraleSignals.createdAt,
    })
    .from(standupMoraleSignals)
    .innerJoin(standups, eq(standupMoraleSignals.standupId, standups.id))
    .where(and(
      eq(standupMoraleSignals.projectId, projectId),
      isNull(standups.deletedAt),
    ))
    .orderBy(desc(standups.standupDate), asc(standupMoraleSignals.createdAt))

  // Group by standup
  const grouped: Record<string, {
    standupId: string
    standupDate: string
    personSignals: typeof rows
    teamSummary: (typeof rows)[0] | null
  }> = {}

  for (const row of rows) {
    if (!grouped[row.standupId]) {
      grouped[row.standupId] = {
        standupId: row.standupId,
        standupDate: row.standupDate,
        personSignals: [],
        teamSummary: null,
      }
    }
    if (row.resourceId) {
      grouped[row.standupId].personSignals.push(row)
    } else {
      grouped[row.standupId].teamSummary = row
    }
  }

  // Return as array sorted by standupDate desc, capped at 20 standups
  const history = Object.values(grouped)
    .sort((a, b) => b.standupDate.localeCompare(a.standupDate))
    .slice(0, 20)

  return { history }
})
