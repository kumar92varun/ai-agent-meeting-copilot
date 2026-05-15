import { getDb } from '../../db/client'
import { dailyMetricsResource } from '../../db/schema'
import { and, eq, gte, lte, desc } from 'drizzle-orm'
import { todayDateIST } from '../../utils/dates'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const resourceId = query.resourceId as string
  if (!resourceId) throw createError({ statusCode: 400, message: 'resourceId required' })

  const from = (query.from as string) || todayDateIST()
  const to = (query.to as string) || todayDateIST()

  const db = getDb()
  return db
    .select()
    .from(dailyMetricsResource)
    .where(
      and(
        eq(dailyMetricsResource.resourceId, resourceId),
        gte(dailyMetricsResource.metricDate, from),
        lte(dailyMetricsResource.metricDate, to)
      )
    )
    .orderBy(desc(dailyMetricsResource.metricDate))
})
