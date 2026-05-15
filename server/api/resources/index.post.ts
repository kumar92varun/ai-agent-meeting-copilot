import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { z } from 'zod'

const CreateResourceSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  resourceType: z.enum(['developer', 'designer', 'qa', 'devops']).default('developer'),
  isActive: z.boolean().default(true),
  quickTeamsLink: z.string().url().optional(),
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = session.user as { role: string }
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: 'Admin only' })

  const body = await readBody(event)
  const parsed = CreateResourceSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const db = getDb()
  const [resource] = await db
    .insert(resources)
    .values({
      name: parsed.data.name,
      email: parsed.data.email || null,
      resourceType: parsed.data.resourceType,
      isActive: parsed.data.isActive,
      quickTeamsLink: parsed.data.quickTeamsLink || null,
      // googleSub required — generate a placeholder for manually created resources
      googleSub: `manual_${Date.now()}`,
    })
    .returning()

  return resource
})
