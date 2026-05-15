import { getDb } from '../db/client'
import { getRedisConnection } from '../jobs/queues'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const checks = { db: false, redis: false }

  try {
    const db = getDb()
    await db.execute(sql`SELECT 1`)
    checks.db = true
  } catch {}

  try {
    const redis = getRedisConnection()
    await redis.ping()
    checks.redis = true
  } catch {}

  const healthy = checks.db && checks.redis

  return {
    status: healthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  }
})
