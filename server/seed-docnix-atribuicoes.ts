import { db } from './db'
import { componentes, componenteAtribuicoes } from './schema'
import { eq, and } from 'drizzle-orm'

// ─────────────────────────────────────────────────────────────
// Atribuições por componente
// ─────────────────────────────────────────────────────────────

const MAXDOC_ATRIBUICOES = [
  // Atribuições específicas do MaxDoc
  { id: 'atrib-maxdoc-criar-doc',           nome: 'Criar Documento',              modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-editar-doc',          nome: 'Editar Documento',             modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-excluir-doc',         nome: 'Excluir Documento',            modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-aprovar-doc',         nome: 'Aprovar Documento',            modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-revisar-doc',         nome: 'Revisar Documento',            modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-obsoletetar-doc',     nome: 'Obsoletetar Documento',        modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-ler-todos',           nome: 'Ler Todos',                    modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-imprimir',            nome: 'Imprimir',                     modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-emitir-copia-ctrl',   nome: 'Emitir Cópia Controlada',      modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-emitir-copia-nctrl',  nome: 'Emitir Cópia Não Controlada',  modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-tabelas-admin',       nome: 'Tabelas Administrativas',      modulo: 'MaxDoc' },
  { id: 'atrib-maxdoc-controle-acesso',     nome: 'Controle de Acesso',           modulo: 'MaxDoc' },
  // Atribuições padrão — retrocompatibilidade com migração de papéis
  { id: 'atrib-maxdoc-visualizar',          nome: 'Visualizar',                   modulo: null },
  { id: 'atrib-maxdoc-usar',                nome: 'Usar',                         modulo: null },
  { id: 'atrib-maxdoc-administrar',         nome: 'Administrar',                  modulo: null },
]

const DOCACTION_ATRIBUICOES = [
  // Atribuições específicas do DocAction
  { id: 'atrib-docaction-criar-ocorrencia',       nome: 'Criar Ocorrência',           modulo: 'DocAction' },
  { id: 'atrib-docaction-categorizar-ocorrencia', nome: 'Categorizar Ocorrência',     modulo: 'DocAction' },
  { id: 'atrib-docaction-analisar-causa',         nome: 'Analisar Causa',             modulo: 'DocAction' },
  { id: 'atrib-docaction-aprovar-analise-causa',  nome: 'Aprovar Análise de Causa',   modulo: 'DocAction' },
  { id: 'atrib-docaction-verificar-eficacia',     nome: 'Verificar Eficácia',         modulo: 'DocAction' },
  { id: 'atrib-docaction-encerrar-ocorrencia',    nome: 'Encerrar Ocorrência',        modulo: 'DocAction' },
  { id: 'atrib-docaction-criar-plano-acao',       nome: 'Criar Plano de Ação',        modulo: 'DocAction' },
  { id: 'atrib-docaction-gerenciar-config',       nome: 'Gerenciar Configurações',    modulo: 'DocAction' },
  // Atribuições padrão — retrocompatibilidade com migração de papéis
  { id: 'atrib-docaction-visualizar',             nome: 'Visualizar',                 modulo: null },
  { id: 'atrib-docaction-usar',                   nome: 'Usar',                       modulo: null },
  { id: 'atrib-docaction-administrar',            nome: 'Administrar',                modulo: null },
]

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function resolveComponenteId(nomeAlvo: string, fallbackId: string): Promise<string> {
  const comps = await db.select().from(componentes)
  console.log('Componentes existentes:', comps.map(c => `${c.id}: ${c.nome}`))

  const encontrado = comps.find(c => c.nome.toLowerCase().includes(nomeAlvo.toLowerCase()))
  if (encontrado) {
    console.log(`  Componente "${nomeAlvo}" encontrado: ${encontrado.id}`)
    return encontrado.id
  }

  // Fallback: usar ID fixo
  console.warn(`  Componente "${nomeAlvo}" não encontrado — usando ID fallback "${fallbackId}"`)
  return fallbackId
}

async function seedAtribuicoes(
  componenteId: string,
  atribuicoes: Array<{ id: string; nome: string; modulo: string | null }>,
) {
  const existentes = await db.select().from(componenteAtribuicoes)
    .where(eq(componenteAtribuicoes.componenteId, componenteId))

  const existentesNomes = new Set(existentes.map(a => a.nome))
  let inseridos = 0

  for (const atrib of atribuicoes) {
    if (existentesNomes.has(atrib.nome)) {
      console.log(`    Atribuição "${atrib.nome}" já existe — ignorando.`)
      continue
    }

    await db.insert(componenteAtribuicoes).values({
      id:           atrib.id,
      componenteId,
      nome:         atrib.nome,
      descricao:    null,
      modulo:       atrib.modulo,
      status:       'Ativo',
      createdAt:    new Date().toISOString(),
    })
    inseridos++
    console.log(`    Atribuição "${atrib.nome}" inserida.`)
  }

  console.log(`  Total inseridas: ${inseridos} / ${atribuicoes.length}`)
}

// ─────────────────────────────────────────────────────────────
// Seed principal
// ─────────────────────────────────────────────────────────────

async function seed() {
  console.log('=== Seed: componente_atribuicoes ===\n')

  // MaxDoc
  console.log('--- MaxDoc ---')
  const maxdocId = await resolveComponenteId('MaxDoc', 'comp-maxdoc')
  await seedAtribuicoes(maxdocId, MAXDOC_ATRIBUICOES)

  // DocAction
  console.log('\n--- DocAction ---')
  const docactionId = await resolveComponenteId('DocAction', 'comp-docaction')
  await seedAtribuicoes(docactionId, DOCACTION_ATRIBUICOES)

  console.log('\nSeed concluído.')
}

seed().catch(console.error)
