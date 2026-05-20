import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Migration: instancia_id em component_permissions...')

  await sql`
    ALTER TABLE component_permissions
    ADD COLUMN IF NOT EXISTS instancia_id text REFERENCES instancias(id) ON DELETE CASCADE
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_comp_perm_instancia
      ON component_permissions (instancia_id)
  `
  console.log('✅ Coluna instancia_id adicionada')
  console.log('🎉 Migration concluída!')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
