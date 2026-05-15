import 'dotenv/config'
import { bootstrapAdmin } from '../server/db/seed/bootstrap'

async function main() {
  await bootstrapAdmin()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
