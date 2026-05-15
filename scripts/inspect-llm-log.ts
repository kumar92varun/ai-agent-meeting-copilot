import 'dotenv/config'
import { getDb } from '../server/db/client'
import { llmCallLogs } from '../server/db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  const logId = process.argv[2]
  if (!logId) {
    console.error('Usage: pnpm inspect-llm-log -- <log-id>')
    process.exit(1)
  }

  const db = getDb()
  const [log] = await db.select().from(llmCallLogs).where(eq(llmCallLogs.id, logId)).limit(1)

  if (!log) {
    console.error(`Log ${logId} not found`)
    process.exit(1)
  }

  console.log('\n=== LLM Call Log ===')
  console.log(`Node:     ${log.nodeName}`)
  console.log(`Model:    ${log.provider}/${log.model}`)
  console.log(`Standup:  ${log.standupId || 'n/a'}`)
  console.log(`Tokens:   ${log.tokensIn} in / ${log.tokensOut} out`)
  console.log(`Duration: ${log.durationMs}ms`)
  console.log(`Cost:     $${log.costUsd?.toFixed(6) || '?'}`)
  if (log.error) console.log(`Error:    ${log.error}`)
  console.log('\n--- PROMPT ---')
  console.log(JSON.stringify(log.prompt, null, 2))
  console.log('\n--- RESPONSE ---')
  console.log(JSON.stringify(log.response, null, 2))

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
