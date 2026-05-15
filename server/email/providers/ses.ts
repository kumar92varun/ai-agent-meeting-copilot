import type { EmailProvider } from '../index'

// Stub — implement when switching to AWS SES
export function createSesProvider(): EmailProvider {
  return {
    async send(_message) {
      throw new Error('SES email provider is not yet implemented.')
    },
  }
}
