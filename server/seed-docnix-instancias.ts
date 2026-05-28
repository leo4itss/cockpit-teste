import 'dotenv/config'

/**
 * Seed: instâncias MaxDoc e DocAction na conta Comgas (DocNix).
 *
 * Uso:
 *   export $(cat .env | xargs) && npx tsx server/seed-docnix-instancias.ts
 *
 * Pré-requisitos: seed-docnix, seed-docnix-atribuicoes (componentes + atribuições).
 */
import { db } from './db'
import { sql } from 'drizzle-orm'
import { componentes, instancias, instanciaMembros, instanciaMembroAtribuicoes } from './schema'
import { eq, and } from 'drizzle-orm'

const ACCOUNT_ID = 'acc-comgas'

const INSTANCIAS = [
  {
    id: 'inst-maxdoc-comgas',
    componenteId: 'comp-maxdoc',
    nome: 'Gestão Documental Comgas',
    descricao: 'Workspace MaxDoc para documentos controlados da Comgas.',
  },
  {
    id: 'inst-docaction-comgas',
    componenteId: 'comp-docaction',
    nome: 'Ocorrências e Ações Comgas',
    descricao: 'Workspace DocAction para ocorrências, planos de ação e eficácia.',
  },
] as const

type MembroSeed = {
  id: string
  instanciaId: string
  entidadeTipo: 'user' | 'group'
  entidadeId: string
  papel: 'viewer' | 'member' | 'admin'
  atribuicaoIds: string[]
}

const MEMBROS: MembroSeed[] = [
  // MaxDoc
  {
    id: 'im-maxdoc-marcelo',
    instanciaId: 'inst-maxdoc-comgas',
    entidadeTipo: 'user',
    entidadeId: 'usr-marcelo-c',
    papel: 'admin',
    atribuicaoIds: ['atrib-maxdoc-administrar', 'atrib-maxdoc-aprovar-doc', 'atrib-maxdoc-usar'],
  },
  {
    id: 'im-maxdoc-fernando',
    instanciaId: 'inst-maxdoc-comgas',
    entidadeTipo: 'user',
    entidadeId: 'usr-fernando',
    papel: 'member',
    atribuicaoIds: ['atrib-maxdoc-criar-doc', 'atrib-maxdoc-editar-doc', 'atrib-maxdoc-usar'],
  },
  {
    id: 'im-maxdoc-aq',
    instanciaId: 'inst-maxdoc-comgas',
    entidadeTipo: 'group',
    entidadeId: 'grp-comgas-aq',
    papel: 'member',
    atribuicaoIds: ['atrib-maxdoc-revisar-doc', 'atrib-maxdoc-visualizar'],
  },
  // DocAction
  {
    id: 'im-docaction-neide',
    instanciaId: 'inst-docaction-comgas',
    entidadeTipo: 'user',
    entidadeId: 'usr-neide',
    papel: 'member',
    atribuicaoIds: ['atrib-docaction-criar-ocorrencia', 'atrib-docaction-categorizar-ocorrencia', 'atrib-docaction-usar'],
  },
  {
    id: 'im-docaction-marcelo',
    instanciaId: 'inst-docaction-comgas',
    entidadeTipo: 'user',
    entidadeId: 'usr-marcelo-c',
    papel: 'admin',
    atribuicaoIds: ['atrib-docaction-administrar', 'atrib-docaction-encerrar-ocorrencia'],
  },
  {
    id: 'im-docaction-aq',
    instanciaId: 'inst-docaction-comgas',
    entidadeTipo: 'group',
    entidadeId: 'grp-comgas-aq',
    papel: 'member',
    atribuicaoIds: ['atrib-docaction-analisar-causa', 'atrib-docaction-aprovar-analise-causa'],
  },
]

async function resolveComponenteId(nomeAlvo: string, fallbackId: string): Promise<string> {
  const comps = await db.select().from(componentes)
  const encontrado = comps.find(c => c.nome.toLowerCase().includes(nomeAlvo.toLowerCase()))
  if (encontrado) return encontrado.id
  throw new Error(
    `Componente "${nomeAlvo}" não encontrado. Execute antes: npx tsx server/seed-docnix-atribuicoes.ts`,
  )
}

async function seed() {
  console.log('=== Seed: instâncias MaxDoc + DocAction (Comgas) ===\n')

  const maxdocId = await resolveComponenteId('MaxDoc', 'comp-maxdoc')
  const docactionId = await resolveComponenteId('DocAction', 'comp-docaction')

  // Garante componentes ativos na listagem
  for (const id of [maxdocId, docactionId]) {
    await db.update(componentes).set({ status: 'Ativo' }).where(eq(componentes.id, id))
  }
  console.log('✅ Componentes MaxDoc e DocAction ativos')

  const createdAt = new Date().toLocaleDateString('pt-BR')
  const compIds = { 'inst-maxdoc-comgas': maxdocId, 'inst-docaction-comgas': docactionId }

  for (const inst of INSTANCIAS) {
    const componenteId = compIds[inst.id as keyof typeof compIds] ?? inst.componenteId
    await db
      .insert(instancias)
      .values({
        id: inst.id,
        componenteId,
        accountId: ACCOUNT_ID,
        nome: inst.nome,
        descricao: inst.descricao,
        status: 'Ativo',
        createdAt,
      })
      .onConflictDoUpdate({
        target: instancias.id,
        set: {
          nome: inst.nome,
          descricao: inst.descricao,
          componenteId,
          status: 'Ativo',
        },
      })
    console.log(`✅ Instância "${inst.nome}" (${inst.id})`)
  }

  let membrosVinculos = 0
  for (const m of MEMBROS) {
    await db
      .insert(instanciaMembros)
      .values({
        id: m.id,
        instanciaId: m.instanciaId,
        entidadeTipo: m.entidadeTipo,
        entidadeId: m.entidadeId,
        papel: m.papel,
        assignedAt: createdAt,
      })
      .onConflictDoNothing()

    for (const atribuicaoId of m.atribuicaoIds) {
      const linkId = `${m.id}-${atribuicaoId}`
      const existentes = await db
        .select()
        .from(instanciaMembroAtribuicoes)
        .where(
          and(
            eq(instanciaMembroAtribuicoes.membroId, m.id),
            eq(instanciaMembroAtribuicoes.atribuicaoId, atribuicaoId),
          ),
        )
      if (existentes.length) continue

      await db.insert(instanciaMembroAtribuicoes).values({
        id: linkId,
        membroId: m.id,
        atribuicaoId,
        assignedAt: new Date().toISOString(),
      })
      membrosVinculos++
    }
  }
  console.log(`✅ ${MEMBROS.length} membros · ${membrosVinculos} vínculos de atribuição`)

  // Fases MaxDoc (ciclo documento)
  await sql`
    INSERT INTO instancia_fases (id, instancia_id, nome, ordem, descricao, created_at)
    VALUES
      ('fase-maxdoc-minuta',     'inst-maxdoc-comgas', 'Minuta',        1, 'Elaboração do documento',     to_char(current_date, 'DD/MM/YYYY')),
      ('fase-maxdoc-revisao',  'inst-maxdoc-comgas', 'Revisão',       2, 'Revisão técnica',             to_char(current_date, 'DD/MM/YYYY')),
      ('fase-maxdoc-aprovacao','inst-maxdoc-comgas', 'Aprovação',     3, 'Aprovação final',             to_char(current_date, 'DD/MM/YYYY')),
      ('fase-maxdoc-vigente',  'inst-maxdoc-comgas', 'Vigente',       4, 'Documento em vigência',       to_char(current_date, 'DD/MM/YYYY'))
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, ordem = EXCLUDED.ordem
  `
  // Fases DocAction (ocorrência)
  await sql`
    INSERT INTO instancia_fases (id, instancia_id, nome, ordem, descricao, created_at)
    VALUES
      ('fase-da-categorizacao', 'inst-docaction-comgas', 'Aguardando Categorização', 1, 'Triagem e categorização', to_char(current_date, 'DD/MM/YYYY')),
      ('fase-da-analise',       'inst-docaction-comgas', 'Análise de Causa',         2, 'Investigação de causa',   to_char(current_date, 'DD/MM/YYYY')),
      ('fase-da-plano',         'inst-docaction-comgas', 'Plano de Ação',            3, 'Plano corretivo/imediato', to_char(current_date, 'DD/MM/YYYY')),
      ('fase-da-eficacia',      'inst-docaction-comgas', 'Verificação de Eficácia',  4, 'Validação de eficácia',   to_char(current_date, 'DD/MM/YYYY')),
      ('fase-da-encerrada',     'inst-docaction-comgas', 'Encerrada',                5, 'Ocorrência encerrada',    to_char(current_date, 'DD/MM/YYYY'))
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, ordem = EXCLUDED.ordem
  `
  // Slots perfil MaxDoc (filtro por atribuição no produto)
  const slots = [
    { id: 'slot-maxdoc-revisor',   nome: 'Revisor',   filtro: 'atrib-maxdoc-revisar-doc',   ordem: 1 },
    { id: 'slot-maxdoc-aprovador',nome: 'Aprovador', filtro: 'atrib-maxdoc-aprovar-doc',   ordem: 2 },
    { id: 'slot-maxdoc-leitor',   nome: 'Leitor',    filtro: 'atrib-maxdoc-leitor-doc',    ordem: 3 },
    { id: 'slot-maxdoc-editor',   nome: 'Editor',    filtro: 'atrib-maxdoc-editor-doc',    ordem: 4 },
  ]
  for (const s of slots) {
    await sql`
      INSERT INTO instancia_perfil_slots (id, instancia_id, slot_nome, atribuicao_filtro_id, obrigatorio, ordem, created_at)
      VALUES (${s.id}, 'inst-maxdoc-comgas', ${s.nome}, ${s.filtro}, false, ${s.ordem}, to_char(current_date, 'DD/MM/YYYY'))
      ON CONFLICT (id) DO UPDATE SET slot_nome = EXCLUDED.slot_nome, atribuicao_filtro_id = EXCLUDED.atribuicao_filtro_id
    `
  }
  console.log('✅ Fases MaxDoc (4) + DocAction (5) + 4 slots de perfil MaxDoc')

  console.log('\n🎉 Concluído. Em Acessos → Instâncias (Comgas), procure:')
  console.log('   · MAXDOC → Gestão Documental Comgas')
  console.log('   · DOCACTION → Ocorrências e Ações Comgas')
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
