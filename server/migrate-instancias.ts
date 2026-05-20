import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Aplicando migration: instancias + instancia_membros...')

  // ── instancias ────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS instancias (
      id            text PRIMARY KEY,
      componente_id text NOT NULL REFERENCES componentes(id),
      account_id    text NOT NULL REFERENCES accounts(id),
      nome          text NOT NULL,
      descricao     text,
      status        text NOT NULL DEFAULT 'Ativo',
      created_at    text NOT NULL
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_instancias_componente
      ON instancias (componente_id, account_id)
  `
  console.log('✅ Tabela instancias criada')

  // ── instancia_membros ─────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS instancia_membros (
      id            text PRIMARY KEY,
      instancia_id  text NOT NULL REFERENCES instancias(id) ON DELETE CASCADE,
      entidade_tipo text NOT NULL,
      entidade_id   text NOT NULL,
      papel         text NOT NULL,
      assigned_at   text NOT NULL
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_instancia_membros_lookup
      ON instancia_membros (instancia_id, entidade_tipo, entidade_id)
  `
  console.log('✅ Tabela instancia_membros criada')

  console.log('\n🎉 Migration aplicada com sucesso!')
}

main().catch(err => {
  console.error('Erro na migration:', err.message)
  process.exit(1)
})
