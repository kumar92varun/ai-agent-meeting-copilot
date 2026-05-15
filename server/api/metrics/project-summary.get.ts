import { getDb } from '../../db/client'
import { dailyMetricsProject } from '../../db/schema'
import { and, eq, gte, lte, desc } from 'drizzle-orm'
import { todayDateIST } from '../../utils/dates'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const projectId = query.projectId as string
  if (!projectId) throw createError({ statusCode: 400, message: 'projectId required' })

  const from = (query.from as string) || todayDateIST()
  const to = (query.to as string) || todayDateIST()

  const db = getDb()
  return db
    .select()
    .from(dailyMetricsProject)
    .where(
      and(
        eq(dailyMetricsProject.projectId, projectId),
        gte(dailyMetricsProject.metricDate, from),
        lte(dailyMetricsProject.metricDate, to)
      )
    )
    .orderBy(desc(dailyMetricsProject.metricDate))
})
