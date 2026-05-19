/**
 * Migration v2 — Bloco 1: grupos, usuario_grupos, user_account_memberships
 *
 * Idempotente — usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
 * Execute com: npx tsx server/migrate-v2.ts
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('🔄 Migration v2 — grupos e permissões...\n')

  // ── grupos ────────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS grupos (
      id          text PRIMARY KEY,
      nome        text NOT NULL,
      descricao   text,
      escopo      text NOT NULL DEFAULT 'org',
      org_id      text REFERENCES organizations(id),
      account_id  text REFERENCES accounts(id),
      status      text NOT NULL DEFAULT 'Ativo',
      created_at  text NOT NULL
    )
  `
  console.log('✅ Tabela grupos criada')

  // ── usuario_grupos ────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS usuario_grupos (
      id          text PRIMARY KEY,
      user_id     text NOT NULL REFERENCES users(id),
      grupo_id    text NOT NULL REFERENCES grupos(id),
      assigned_at text NOT NULL
    )
  `
  console.log('✅ Tabela usuario_grupos criada')

  // ── user_account_memberships ──────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS user_account_memberships (
      id          text PRIMARY KEY,
      user_id     text NOT NULL REFERENCES users(id),
      account_id  text NOT NULL REFERENCES accounts(id),
      papel       text NOT NULL DEFAULT 'member',
      assigned_at text NOT NULL
    )
  `
  console.log('✅ Tabela user_account_memberships criada')

  // Reparo: tabelas criadas antes desta migration podem faltar colunas
  await sql`ALTER TABLE usuario_grupos ADD COLUMN IF NOT EXISTS assigned_at text NOT NULL DEFAULT ''`
  await sql`ALTER TABLE user_account_memberships ADD COLUMN IF NOT EXISTS assigned_at text NOT NULL DEFAULT ''`
  await sql`ALTER TABLE user_account_memberships ADD COLUMN IF NOT EXISTS papel text NOT NULL DEFAULT 'member'`
  // Legado: versão antiga usava created_at em vez de assigned_at
  await sql`ALTER TABLE user_account_memberships DROP COLUMN IF EXISTS created_at`
  console.log('✅ Colunas ausentes garantidas (assigned_at, papel); legado created_at removido')

  // Índices úteis para queries FGA
  await sql`CREATE INDEX IF NOT EXISTS idx_usuario_grupos_user    ON usuario_grupos(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_usuario_grupos_grupo   ON usuario_grupos(grupo_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_uam_user               ON user_account_memberships(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_uam_account            ON user_account_memberships(account_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_grupos_org             ON grupos(org_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_grupos_account         ON grupos(account_id)`
  console.log('✅ Índices criados')

  console.log('\n🎉 Migration v2 aplicada com sucesso!')
}

main().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
