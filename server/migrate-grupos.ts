/**
 * Script de migração pontual: adiciona colunas escopo/org_id/account_id à
 * tabela grupos e cria a tabela user_account_memberships.
 * Execute com: npx tsx server/migrate-grupos.ts
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('🔄 Aplicando migration grupos_escopo...')

  // 1. Adicionar colunas na tabela grupos (ignora se já existir)
  await sql`
    ALTER TABLE grupos
      ADD COLUMN IF NOT EXISTS escopo text NOT NULL DEFAULT 'org',
      ADD COLUMN IF NOT EXISTS org_id  text REFERENCES organizations(id),
      ADD COLUMN IF NOT EXISTS account_id text REFERENCES accounts(id)
  `
  console.log('✅ Colunas escopo/org_id/account_id adicionadas em grupos')

  // 2. Criar tabela user_account_memberships (ignora se já existir)
  await sql`
    CREATE TABLE IF NOT EXISTS user_account_memberships (
      id         text PRIMARY KEY,
      user_id    text NOT NULL REFERENCES users(id),
      account_id text NOT NULL REFERENCES accounts(id),
      papel      text NOT NULL DEFAULT 'member',
      created_at text NOT NULL
    )
  `
  console.log('✅ Tabela user_account_memberships criada')

  console.log('🎉 Migration aplicada com sucesso!')
}

main().catch(err => {
  console.error('❌ Erro na migration:', err.message)
  process.exit(1)
})
