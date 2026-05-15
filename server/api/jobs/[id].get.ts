import { computeProjectRollupsQueue, computeResourceRollupsQueue } from '../../jobs/queues'

export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'id')!

  // Try each queue
  const queues = [computeProjectRollupsQueue, computeResourceRollupsQueue]
  for (const queue of queues) {
    const job = await queue.getJob(jobId)
    if (!job) continue

    const state = await job.getState()
    return {
      jobId,
      state,
      progress: job.progress,
      result: job.returnvalue,
      error: job.failedReason,
    }
  }

  throw createError({ statusCode: 404, message: 'Job not found' })
})
