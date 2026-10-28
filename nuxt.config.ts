// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', 'nuxt-auth-utils'],

  srcDir: 'app/',
  serverDir: './server',

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // nuxt-auth-utils reads session password from runtimeConfig.session.password
    session: {
      password: process.env.SESSION_SECRET || '',
    },

    // nuxt-auth-utils reads OAuth credentials from runtimeConfig.oauth.<provider>
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
    },

    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || '',

    llmProvider: process.env.LLM_PROVIDER || 'openai',
    llmModel: process.env.LLM_MODEL || 'gpt-4o',
    llmApiKey: process.env.LLM_API_KEY || '',
    llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.2'),

    embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingApiKey: process.env.EMBEDDING_API_KEY || '',

    emailProvider: process.env.EMAIL_PROVIDER || 'sendgrid',
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@crownstack.com',
    emailFromName: process.env.EMAIL_FROM_NAME || 'Standup Intelligence',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',

    sentryDsn: process.env.SENTRY_DSN || '',
    logLevel: process.env.LOG_LEVEL || 'info',

defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Kolkata',

    public: {
      appUrl: process.env.APP_URL || 'http://localhost:3000',
      allowedEmailDomains: process.env.ALLOWED_EMAIL_DOMAINS || 'crownstack.com',
      // Open-access mode: no login, every visitor is a shared admin. Override at runtime with NUXT_PUBLIC_AUTH_DISABLED.
      authDisabled: process.env.AUTH_DISABLED === 'true',
    },
  },

  ui: {
    global: true,
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  nitro: {
    experimental: {
      openAPI: false,
    },
  },

  app: {
    head: {
      title: 'Standup Intelligence — Crownstack',
      meta: [
        { name: 'description', content: 'Project and resource health intelligence for Crownstack standups' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})
