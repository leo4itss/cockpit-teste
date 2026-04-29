import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS contract_versions (
      id text PRIMARY KEY,
      contrato_id text NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
      versao integer NOT NULL,
      snapshot_plano jsonb NOT NULL,
      alterado_por text NOT NULL DEFAULT 'sistema',
      alterado_em text NOT NULL,
      motivo text
    )
  `
  console.log('✅ Tabela contract_versions criada (ou já existia).')
}

main().catch(err => { console.error(err); process.exit(1) })
