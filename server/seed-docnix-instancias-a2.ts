import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

/**
 * Seed: instâncias MaxDoc e DocAction na conta Santacruz (a2) — Account Admin Carla.
 *
 * Pré-requisito: seed-docnix-atribuicoes.ts (cria comp-maxdoc e comp-docaction)
 *
 * Uso:
 *   npx tsx server/seed-docnix-instancias-a2.ts
 */

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('=== Seed: instâncias DocNix — Santacruz (a2) ===\n')

  // ── 1. Garantir que comp-maxdoc e comp-docaction estão ativos ──
  for (const id of ['comp-maxdoc', 'comp-docaction']) {
    await sql`
      UPDATE componentes SET status = 'Ativo', tipo_modelo = 'docnix'
      WHERE id = ${id}
    `
  }
  console.log('✅ comp-maxdoc e comp-docaction marcados como docnix/Ativo')

  // ── 2. Criar instâncias ────────────────────────────────────────
  const instancias = [
    {
      id:          'inst-a2-maxdoc',
      compId:      'comp-maxdoc',
      nome:        'Gestão Documental Santacruz',
      desc:        'MaxDoc para documentos controlados da Santacruz (SOPs, registros regulatórios).',
    },
    {
      id:          'inst-a2-docaction',
      compId:      'comp-docaction',
      nome:        'Ocorrências Santacruz',
      desc:        'DocAction para desvios, não conformidades e planos de ação corretiva.',
    },
  ]

  for (const i of instancias) {
    await sql`
      INSERT INTO instancias (id, componente_id, account_id, nome, descricao, status, created_at)
      VALUES (${i.id}, ${i.compId}, 'a2', ${i.nome}, ${i.desc}, 'Ativo', to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, status = 'Ativo'
    `
    console.log(`✅ Instância "${i.nome}" (${i.id})`)
  }

  // ── 3. Membros das instâncias ──────────────────────────────────
  const membros = [
    // MaxDoc — Thiago admin, Beatriz member, grupo Farmacêuticos member
    { id: 'im-a2md-thiago',  instId: 'inst-a2-maxdoc',   tipo: 'user',  entId: 'usr-thiago',       papel: 'admin'  },
    { id: 'im-a2md-beatriz', instId: 'inst-a2-maxdoc',   tipo: 'user',  entId: 'usr-beatriz',      papel: 'member' },
    { id: 'im-a2md-farma',   instId: 'inst-a2-maxdoc',   tipo: 'group', entId: 'grp-santa-farma',  papel: 'member' },
    // DocAction — Lucas member, grupo Vendas viewer
    { id: 'im-a2da-lucas',   instId: 'inst-a2-docaction', tipo: 'user',  entId: 'usr-lucas',        papel: 'member' },
    { id: 'im-a2da-vendas',  instId: 'inst-a2-docaction', tipo: 'group', entId: 'grp-santa-vendas', papel: 'viewer' },
  ]

  for (const m of membros) {
    await sql`
      INSERT INTO instancia_membros (id, instancia_id, entidade_tipo, entidade_id, papel, assigned_at)
      VALUES (${m.id}, ${m.instId}, ${m.tipo}, ${m.entId}, ${m.papel}, to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO NOTHING
    `
  }
  console.log(`✅ ${membros.length} membros atribuídos`)

  // ── 4. Fases MaxDoc ────────────────────────────────────────────
  await sql`
    INSERT INTO instancia_fases (id, instancia_id, nome, ordem, descricao, created_at)
    VALUES
      ('fase-a2md-minuta',    'inst-a2-maxdoc', 'Minuta',    1, 'Elaboração do documento',  to_char(current_date, 'DD/MM/YYYY')),
      ('fase-a2md-revisao',   'inst-a2-maxdoc', 'Revisão',   2, 'Revisão técnica',          to_char(current_date, 'DD/MM/YYYY')),
      ('fase-a2md-aprovacao', 'inst-a2-maxdoc', 'Aprovação', 3, 'Aprovação final',          to_char(current_date, 'DD/MM/YYYY')),
      ('fase-a2md-vigente',   'inst-a2-maxdoc', 'Vigente',   4, 'Documento em vigência',    to_char(current_date, 'DD/MM/YYYY'))
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, ordem = EXCLUDED.ordem
  `

  // ── 5. Fases DocAction ────────────────────────────────────────
  await sql`
    INSERT INTO instancia_fases (id, instancia_id, nome, ordem, descricao, created_at)
    VALUES
      ('fase-a2da-categ',   'inst-a2-docaction', 'Categorização',        1, 'Triagem e categorização',  to_char(current_date, 'DD/MM/YYYY')),
      ('fase-a2da-analise', 'inst-a2-docaction', 'Análise de Causa',     2, 'Investigação de causa',    to_char(current_date, 'DD/MM/YYYY')),
      ('fase-a2da-plano',   'inst-a2-docaction', 'Plano de Ação',        3, 'Ação corretiva/imediata',  to_char(current_date, 'DD/MM/YYYY')),
      ('fase-a2da-eficacia','inst-a2-docaction', 'Verif. de Eficácia',   4, 'Validação de eficácia',    to_char(current_date, 'DD/MM/YYYY')),
      ('fase-a2da-encerr',  'inst-a2-docaction', 'Encerrada',            5, 'Ocorrência encerrada',     to_char(current_date, 'DD/MM/YYYY'))
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, ordem = EXCLUDED.ordem
  `
  console.log('✅ Fases MaxDoc (4) + DocAction (5)')

  console.log('\n🎉 Pronto! Em Acessos → Instâncias (Carla / Santacruz):')
  console.log('   · MAXDOC    → Gestão Documental Santacruz')
  console.log('   · DOCACTION → Ocorrências Santacruz')
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
