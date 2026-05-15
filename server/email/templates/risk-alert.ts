export function buildRiskAlertEmail(
  riskTitle: string,
  riskDescription: string,
  severity: string,
  projectName: string | null,
  resourceName: string | null,
  rawQuote: string | null
): string {
  const context = [projectName && `Project: ${projectName}`, resourceName && `Resource: ${resourceName}`]
    .filter(Boolean)
    .join(' | ')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Risk Alert</title></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#c0392b">Risk Alert — ${severity.toUpperCase()}</h2>
  <h3>${riskTitle}</h3>
  ${context ? `<p style="color:#666">${context}</p>` : ''}
  <p>${riskDescription}</p>
  ${
    rawQuote
      ? `<blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;font-style:italic">"${rawQuote}"</blockquote>`
      : ''
  }
  <p style="margin-top:24px;font-size:12px;color:#888">
    You're receiving this because you're an admin or project lead on Crownstack Standup Intelligence.
  </p>
</body>
</html>`
}
