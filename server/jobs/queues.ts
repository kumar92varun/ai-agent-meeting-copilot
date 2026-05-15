import { Queue } from 'bullmq'
import IORedis from 'ioredis'

let _connection: IORedis | null = null

export function getRedisConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    })
  }
  return _connection
}

const queueOptions = () => ({ connection: getRedisConnection() })

export const processStandupQueue = new Queue('process-standup', queueOptions())
export const computeProjectRollupsQueue = new Queue('compute-project-rollups', queueOptions())
export const computeResourceRollupsQueue = new Queue('compute-resource-rollups', queueOptions())
export const computeDailyRollupsQueue = new Queue('compute-daily-rollups', queueOptions())
export const checkDeadlineCompletionsQueue = new Queue('check-deadline-completions', queueOptions())
export const generateEmbeddingQueue = new Queue('generate-embedding', queueOptions())
export const sendDailyRiskDigestQueue = new Queue('send-daily-risk-digest', queueOptions())
export const sendNotificationEmailQueue = new Queue('send-notification-email', queueOptions())
