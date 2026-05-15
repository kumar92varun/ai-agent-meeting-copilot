import type { EmailProvider } from '../index'

// Stub — implement when switching to SMTP
export function createSmtpProvider(): EmailProvider {
  return {
    async send(_message) {
      throw new Error('SMTP email provider is not yet implemented.')
    },
  }
}
