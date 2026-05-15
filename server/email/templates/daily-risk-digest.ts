import type { Risk } from '../../../shared/types/domain'

export function buildDailyRiskDigestEmail(risks: Risk[], recipientName: string): string {
  const riskRows = risks
    .map(
      (r) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${(r as unknown as Record<string, unknown>).title}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-transform:capitalize">${(r as unknown as Record<string, unknown>).severity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-transform:capitalize">${(r as unknown as Record<string, unknown>).category}</td>
    </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Daily Risk Digest</title></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1a1a2e">Standup Intelligence — Daily Risk Digest</h2>
  <p>Hi ${recipientName},</p>
  <p>Here is your risk summary for today (${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}):</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <thead>
      <tr style="background:#f5f5f5">
        <th style="padding:8px;text-align:left">Risk</th>
        <th style="padding:8px;text-align:left">Severity</th>
        <th style="padding:8px;text-align:left">Category</th>
      </tr>
    </thead>
    <tbody>${riskRows}</tbody>
  </table>
  <p style="margin-top:24px;font-size:12px;color:#888">
    You're receiving this because you're an admin or project lead on Crownstack Standup Intelligence.
  </p>
</body>
</html>`
}
