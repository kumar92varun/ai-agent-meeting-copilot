import { getDb } from '../../db/client'
import { users } from '../../db/schema'
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
      .from(users)
      .where(and(eq(users.googleSub, googleUser.sub), isNull(users.deletedAt)))
      .limit(1)

    if (!dbUser) {
      // Auto-register on first Google login (role defaults to project_lead; admin promotes manually)
      ;[dbUser] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          name: googleUser.name,
          googleSub: googleUser.sub,
          avatarUrl: googleUser.picture || null,
          role: 'project_lead',
        })
        .returning()
    } else {
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), avatarUrl: googleUser.picture || null, updatedAt: new Date() })
        .where(eq(users.id, dbUser.id))
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
