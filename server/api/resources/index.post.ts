import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { z } from 'zod'

const CreateResourceSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  roleTitle: z.string().max(200).optional(),
  resourceType: z.enum(['developer', 'designer', 'qa', 'devops']).default('developer'),
  joinedAt: z.string().optional(),
  isActive: z.boolean().default(true),
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
      ...parsed.data,
      joinedAt: parsed.data.joinedAt ? new Date(parsed.data.joinedAt) : null,
    })
    .returning()

  return resource
})
