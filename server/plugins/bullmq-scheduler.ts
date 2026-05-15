import {
  computeDailyRollupsQueue,
  checkDeadlineCompletionsQueue,
  sendDailyRiskDigestQueue,
} from '../jobs/queues'
import { logger } from '../utils/logger'

export default defineNitroPlugin(async () => {
  if (process.env.NODE_ENV !== 'production' && process.env.REGISTER_CRON !== 'true') {
    logger.info('Skipping BullMQ cron registration in non-production mode')
    return
  }

  // 2am IST = 8:30pm UTC
  await computeDailyRollupsQueue.upsertJobScheduler('daily-rollups-cron', {
    pattern: '30 20 * * *',
  })

  // 6pm IST = 12:30pm UTC
  await checkDeadlineCompletionsQueue.upsertJobScheduler('deadline-check-cron', {
    pattern: '30 12 * * *',
  })

  // 9am IST = 3:30am UTC
  await sendDailyRiskDigestQueue.upsertJobScheduler('daily-digest-cron', {
    pattern: '30 3 * * *',
  })

  logger.info('BullMQ cron jobs registered')
})
