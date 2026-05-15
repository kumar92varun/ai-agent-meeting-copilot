import { getDb } from '../db/client'
import { auditLog } from '../db/schema'
import { logger } from '../utils/logger'

const AUDITED_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE']

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  if (!url.pathname.startsWith('/api/') || !AUDITED_METHODS.includes(event.method)) return

  // Run after response
  event.node.res.on('finish', async () => {
    try {
      const session = await getUserSession(event).catch(() => null)
      if (!session?.user) return

      const segments = url.pathname.split('/').filter(Boolean)
      const entityType = segments[1] || 'unknown'
      const entityId = segments[2] || null

      const db = getDb()
      await db.insert(auditLog).values({
        actorUserId: (session.user as { id?: string }).id || null,
        action: event.method,
        entityType,
        entityId: entityId && entityId.match(/^[0-9a-f-]{36}$/) ? entityId : null,
        ipAddress: getRequestIP(event) || null,
      })
    } catch (err) {
      logger.error({ err }, 'Failed to write audit log')
    }
  })
})
