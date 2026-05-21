/**
 * Fix pontual: atribui orgId aos grupos com escopo='org' que estão sem org_id nem account_id.
 * Distribui entre Apple (id=1) e Santacruz (id=2).
 *
 * Execute com: npx tsx server/fix-grupos-orfaos.ts
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Distribuição: grupos com cheiro de "teste/dev" → Apple; grupos funcionais → Santacruz
const APPLE      = '1'
const SANTACRUZ  = '2'

const MAPA: Record<string, string> = {
  'e4d69ab8-bc0d-4eec-b0e3-1a30e75cabb9': APPLE,      // Grupo Preview Test (0 membros)
  '9cb5526a-f673-457e-8a4f-30759eef19dc': APPLE,      // Grupo Erro Test (0 membros)
  'debug-test2':                           APPLE,      // Debug2 (0 membros)
  'a029c76d-2e07-4322-8183-5b20e1778c74': APPLE,      // teste (4 membros)
  '99b708fc-d14f-4db6-8191-5b7a46c1a5ed': SANTACRUZ, // tests 2 (4 membros)
  'grp-teste-final':                       SANTACRUZ, // Grupo Teste Final (5 membros)
  'test-123':                              APPLE,      // Teste (3 membros)
  '484a8f24-77be-4e84-bde5-a488db6b9440': APPLE,      // Grupo sem permissões (2 membros)
  'a40b6bf0-592c-4214-8bd8-90b21e528724': SANTACRUZ, // Teste pos shaping (3 membros)
  '97ad931e-eb47-4cb1-bd6a-cd43e98d6660': SANTACRUZ, // Marketing (5 membros)
  'test-456':                              SANTACRUZ, // Teste Com Membro (9 membros)
}

async function main() {
  console.log('🔄 Corrigindo grupos órfãos (sem org_id/account_id)...\n')

  let ok = 0, erros = 0

  for (const [id, orgId] of Object.entries(MAPA)) {
    try {
      await sql`
        UPDATE grupos
        SET    org_id = ${orgId}
        WHERE  id     = ${id}
          AND  org_id IS NULL
          AND  account_id IS NULL
      `
      console.log(`  ✅ ${id}  →  org ${orgId}`)
      ok++
    } catch (e: any) {
      console.error(`  ❌ ${id}: ${e.message}`)
      erros++
    }
  }

  console.log(`\n🎉 Concluído: ${ok} corrigidos, ${erros} erros`)
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
