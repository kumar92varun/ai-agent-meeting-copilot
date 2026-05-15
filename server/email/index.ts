export interface EmailMessage {
  to: string | string[]
  subject: string
  htmlBody: string
  textBody?: string
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>
}

let _provider: EmailProvider | null = null

export function getEmailProvider(): EmailProvider {
  if (_provider) return _provider

  const providerName = process.env.EMAIL_PROVIDER || 'sendgrid'

  switch (providerName) {
    case 'ses':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _provider = require('./providers/ses').createSesProvider()
      break
    case 'smtp':
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _provider = require('./providers/smtp').createSmtpProvider()
      break
    case 'sendgrid':
    default:
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _provider = require('./providers/sendgrid').createSendgridProvider()
  }

  return _provider!
}
