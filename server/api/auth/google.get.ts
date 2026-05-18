import { getDb } from '../../db/client'
import { resources } from '../../db/schema'
import { eq, isNull, and } from 'drizzle-orm'

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: googleUser }) {
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || 'crownstack.com')
      .split(',')
      .map((d) => d.trim())

    const emailDomain = googleUser.email?.split('@')[1]
    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      throw createError({
        statusCode: 403,
        message: `Login restricted to: ${allowedDomains.join(', ')}`,
      })
    }

    const db = getDb()

    let [dbUser] = await db
      .select()
      .from(resources)
      .where(and(eq(resources.googleSub, googleUser.sub), isNull(resources.deletedAt)))
      .limit(1)

    if (!dbUser) {
      // First-time login — create as project_member; admin must promote to grant app access
      ;[dbUser] = await db
        .insert(resources)
        .values({
          email: googleUser.email,
          name: googleUser.name,
          googleSub: googleUser.sub,
          avatarUrl: googleUser.picture || null,
          role: 'project_member',
        })
        .returning()
    } else {
      await db
        .update(resources)
        .set({ lastLoginAt: new Date(), avatarUrl: googleUser.picture || null, updatedAt: new Date() })
        .where(eq(resources.id, dbUser.id))
    }

    if (dbUser.role === 'project_member') {
      return sendRedirect(event, '/login?error=no_access')
    }

    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        avatarUrl: dbUser.avatarUrl,
      },
    })

    return sendRedirect(event, '/dashboard')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  },
})
