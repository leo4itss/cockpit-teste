import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  await sql`
    ALTER TABLE grupos
    ADD COLUMN IF NOT EXISTS papel TEXT NOT NULL DEFAULT ''
  `
  console.log('✅ coluna papel adicionada à tabela grupos')
}

migrate().catch(console.error)
