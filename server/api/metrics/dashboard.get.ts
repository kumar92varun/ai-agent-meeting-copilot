import { getDb } from '../../db/client'
import { projects, risks, standups, dailyMetricsProject, projectLeads } from '../../db/schema'
import { and, eq, isNull, inArray, count, gte } from 'drizzle-orm'
import { todayDateIST, addDaysToDate } from '../../utils/dates'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { id: string; role: string }
  const db = getDb()

  const today = todayDateIST()
  const weekAgo = addDaysToDate(today, -7)

  let projectIds: string[] | null = null

  if (user.role !== 'admin') {
    const assigned = await db
      .select({ projectId: projectLeads.projectId })
      .from(projectLeads)
      .where(eq(projectLeads.userId, user.id))
    projectIds = assigned.map((a) => a.projectId)
    if (!projectIds.length) return { projects: [], kpis: { activeProjects: 0, openRisks: 0, standupsThisWeek: 0, resourcesAtRisk: 0 } }
  }

  const projectCond = projectIds
    ? and(isNull(projects.deletedAt), inArray(projects.id, projectIds))
    : isNull(projects.deletedAt)

  const activeProjects = await db.select().from(projects).where(projectCond)

  const activeIds = activeProjects.map((p) => p.id)
  if (!activeIds.length) {
    return { projects: [], kpis: { activeProjects: 0, openRisks: 0, standupsThisWeek: 0, resourcesAtRisk: 0 } }
  }

  const [openRisksRow] = await db
    .select({ c: count() })
    .from(risks)
    .where(and(isNull(risks.deletedAt), eq(risks.status, 'open'), inArray(risks.projectId as any, activeIds)))

  const [standupsWeekRow] = await db
    .select({ c: count() })
    .from(standups)
    .where(
      and(
        isNull(standups.deletedAt),
        inArray(standups.projectId, activeIds),
        gte(standups.standupDate, weekAgo)
      )
    )

  const latestMetrics = await db
    .select()
    .from(dailyMetricsProject)
    .where(and(inArray(dailyMetricsProject.projectId, activeIds), eq(dailyMetricsProject.metricDate, today)))

  const metricsMap = Object.fromEntries(latestMetrics.map((m) => [m.projectId, m]))

  const projectsWithHealth = activeProjects.map((p) => ({
    ...p,
    metrics: metricsMap[p.id] || null,
  }))

  return {
    projects: projectsWithHealth,
    kpis: {
      activeProjects: activeProjects.length,
      openRisks: Number(openRisksRow.c),
      standupsThisWeek: Number(standupsWeekRow.c),
      resourcesAtRisk: 0,
    },
  }
})
