/**
 * Seed de entitlements (capabilities) para as contas de demonstração.
 * Idempotente — usa INSERT … ON CONFLICT DO NOTHING.
 *
 * Execute com: npx tsx server/seed-entitlements.ts
 *
 * Contas cobertas:
 *   a1       (Apple)    → assistant.use, knowledge.use, analytics.use
 *   a2       (Santacruz) → assistant.use, knowledge.use, analytics.use, maxdoc.use, docaction.use
 *   acc-comgas (Comgas)  → assistant.use, knowledge.use, maxdoc.use, docaction.use
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const ENTITLEMENTS: { id: string; accountId: string; capability: string }[] = [
  // ── Apple (a1) ───────────────────────────────────────────────
  { id: 'ent-a1-assistant',  accountId: 'a1', capability: 'assistant.use' },
  { id: 'ent-a1-knowledge',  accountId: 'a1', capability: 'knowledge.use' },
  { id: 'ent-a1-analytics',  accountId: 'a1', capability: 'analytics.use' },

  // ── Santacruz (a2) ───────────────────────────────────────────
  { id: 'ent-a2-assistant',  accountId: 'a2', capability: 'assistant.use' },
  { id: 'ent-a2-knowledge',  accountId: 'a2', capability: 'knowledge.use' },
  { id: 'ent-a2-analytics',  accountId: 'a2', capability: 'analytics.use' },
  { id: 'ent-a2-maxdoc',     accountId: 'a2', capability: 'maxdoc.use' },
  { id: 'ent-a2-docaction',  accountId: 'a2', capability: 'docaction.use' },

  // ── Comgas (acc-comgas) ──────────────────────────────────────
  { id: 'ent-comgas-assistant', accountId: 'acc-comgas', capability: 'assistant.use' },
  { id: 'ent-comgas-knowledge', accountId: 'acc-comgas', capability: 'knowledge.use' },
  { id: 'ent-comgas-maxdoc',    accountId: 'acc-comgas', capability: 'maxdoc.use' },
  { id: 'ent-comgas-docaction', accountId: 'acc-comgas', capability: 'docaction.use' },
]

async function main() {
  console.log('🌱 Seeding entitlements...\n')

  let inserted = 0
  for (const e of ENTITLEMENTS) {
    const result = await sql`
      INSERT INTO account_entitlements (id, account_id, capability, enabled_at)
      VALUES (${e.id}, ${e.accountId}, ${e.capability},
              to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
    if ((result as any).rowCount > 0) inserted++
  }

  const skipped = ENTITLEMENTS.length - inserted
  console.log(`✅ ${inserted} entitlement(s) inserido(s) (${skipped} já existiam)`)
  console.log('\nEstado final:')
  console.log('  Apple    (a1)       — assistant.use, knowledge.use, analytics.use')
  console.log('  Santacruz (a2)      — assistant.use, knowledge.use, analytics.use, maxdoc.use, docaction.use')
  console.log('  Comgas (acc-comgas) — assistant.use, knowledge.use, maxdoc.use, docaction.use')
}

main().catch(err => { console.error(err); process.exit(1) })
