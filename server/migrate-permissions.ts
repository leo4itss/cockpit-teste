/**
 * Migration: cria tabela component_permissions com índice composto.
 * Execute com: npx tsx server/migrate-permissions.ts
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('🔄 Aplicando migration component_permissions...')

  await sql`
    CREATE TABLE IF NOT EXISTS component_permissions (
      id             text PRIMARY KEY,
      entidade_tipo  text NOT NULL,
      entidade_id    text NOT NULL,
      componente_id  text NOT NULL,
      acao           text NOT NULL,
      created_at     text NOT NULL
    )
  `
  console.log('✅ Tabela component_permissions criada')

  await sql`
    CREATE INDEX IF NOT EXISTS idx_comp_perm_lookup
      ON component_permissions (entidade_tipo, entidade_id, componente_id, acao)
  `
  console.log('✅ Índice idx_comp_perm_lookup criado')

  console.log('🎉 Migration aplicada com sucesso!')
}

main().catch(err => {
  console.error('❌ Erro na migration:', err.message)
  process.exit(1)
})
