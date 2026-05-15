import { getDb } from '../db/client'
import { users, risks, notificationSettings, projectLeads } from '../db/schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { getEmailProvider } from '../email'
import { buildDailyRiskDigestEmail } from '../email/templates/daily-risk-digest'
import { logger } from '../utils/logger'

export async function sendDailyRiskDigest() {
  const db = getDb()
  const email = getEmailProvider()

  // Get all users with digest enabled
  const settings = await db
    .select({ userId: notificationSettings.userId, severityThreshold: notificationSettings.severityThreshold })
    .from(notificationSettings)
    .where(eq(notificationSettings.dailyRiskDigestEnabled, true))

  for (const setting of settings) {
    const user = await db
      .select()
      .from(users)
      .where(and(eq(users.id, setting.userId), isNull(users.deletedAt)))
      .limit(1)
      .then((r) => r[0])

    if (!user) continue

    let projectFilter: string[] | undefined

    // project_leads only see their assigned projects
    if (user.role === 'project_lead') {
      const assigned = await db
        .select({ projectId: projectLeads.projectId })
        .from(projectLeads)
        .where(eq(projectLeads.userId, user.id))
      projectFilter = assigned.map((a) => a.projectId)
      if (!projectFilter.length) continue
    }

    const severities = getSeveritiesAtOrAbove(setting.severityThreshold)

    const openRisks = await db
      .select()
      .from(risks)
      .where(
        and(
          eq(risks.status, 'open'),
          isNull(risks.deletedAt),
          projectFilter ? inArray(risks.projectId as any, projectFilter) : undefined
        )
      )

    const filteredRisks = openRisks.filter((r) => severities.includes(r.severity as string))
    if (!filteredRisks.length) continue

    const html = buildDailyRiskDigestEmail(filteredRisks as unknown as import('../../shared/types/domain').Risk[], user.name)

    await email.send({
      to: user.email,
      subject: `Standup Intelligence — ${filteredRisks.length} open risk(s) require attention`,
      htmlBody: html,
    })

    logger.info({ userId: user.id, riskCount: filteredRisks.length }, 'Daily risk digest sent')
  }
}

function getSeveritiesAtOrAbove(threshold: string): string[] {
  const order = ['low', 'medium', 'high', 'critical']
  const idx = order.indexOf(threshold)
  return idx === -1 ? order : order.slice(idx)
}
