import { getDb } from '../../db/client'
import { users, projectLeads } from '../../db/schema'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'project_lead']),
  projectIds: z.array(z.string().uuid()).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const actor = session.user as { role: string }
  if (actor.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const body = await readBody(event)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const [user] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      googleSub: `manual_${Date.now()}`,
      role: parsed.data.role,
    })
    .returning()

  if (parsed.data.role === 'project_lead' && parsed.data.projectIds?.length) {
    await db.insert(projectLeads).values(
      parsed.data.projectIds.map((projectId) => ({ projectId, userId: user.id }))
    )
  }

  return user
})
