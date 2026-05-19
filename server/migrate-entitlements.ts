import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS account_entitlements (
      id          TEXT PRIMARY KEY,
      account_id  TEXT NOT NULL REFERENCES accounts(id),
      capability  TEXT NOT NULL,
      enabled_at  TEXT NOT NULL,
      UNIQUE(account_id, capability)
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_account_entitlements
    ON account_entitlements(account_id, capability)
  `
  console.log('✅ account_entitlements criada com sucesso')
}

migrate().catch(console.error)
