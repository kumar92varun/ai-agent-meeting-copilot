import sgMail from '@sendgrid/mail'
import type { EmailProvider, EmailMessage } from '../index'

export function createSendgridProvider(): EmailProvider {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid')
  sgMail.setApiKey(apiKey)

  return {
    async send(message: EmailMessage) {
      const from = {
        email: process.env.EMAIL_FROM_ADDRESS || 'noreply@crownstack.com',
        name: process.env.EMAIL_FROM_NAME || 'Standup Intelligence',
      }
      await sgMail.send({
        to: message.to,
        from,
        subject: message.subject,
        html: message.htmlBody,
        text: message.textBody,
      })
    },
  }
}
