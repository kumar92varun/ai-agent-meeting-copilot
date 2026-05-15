import 'dotenv/config'
import { Worker } from 'bullmq'
import { getRedisConnection } from './jobs/queues'
import { computeProjectRollups } from './jobs/compute-project-rollups'
import { computeResourceRollups } from './jobs/compute-resource-rollups'
import { checkDeadlineCompletions } from './jobs/check-deadline-completions'
import { generateEmbedding } from './jobs/generate-embedding'
import { sendDailyRiskDigest } from './jobs/send-daily-risk-digest'
import { logger } from './utils/logger'

const connection = getRedisConnection()

function makeWorker(queueName: string, handler: (data: unknown) => Promise<void>) {
  const worker = new Worker(
    queueName,
    async (job) => {
      logger.info({ queue: queueName, jobId: job.id }, 'Job started')
      await handler(job.data)
      logger.info({ queue: queueName, jobId: job.id }, 'Job completed')
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    logger.error({ queue: queueName, jobId: job?.id, err }, 'Job failed')
  })

  return worker
}

makeWorker('compute-project-rollups', (data) =>
  computeProjectRollups(data as { projectId: string; date?: string })
)

makeWorker('compute-resource-rollups', (data) =>
  computeResourceRollups(data as { resourceId: string; date?: string })
)

makeWorker('compute-daily-rollups', async (_data) => {
  // Full rebuild handled by individual project+resource rollup jobs
  logger.info('Daily rollups cron triggered — see individual project/resource queues')
})

makeWorker('check-deadline-completions', async () => checkDeadlineCompletions())

makeWorker('generate-embedding', (data) =>
  generateEmbedding(data as { entityType: 'standup' | 'task' | 'risk'; entityId: string })
)

makeWorker('send-daily-risk-digest', async () => sendDailyRiskDigest())

makeWorker('send-notification-email', async (_data) => {
  logger.info('Notification email job triggered')
})

logger.info('BullMQ worker started — listening on all queues')
