import 'dotenv/config'
import { db } from './db'
import { componentes, componenteAtribuicoes } from './schema'
import { eq } from 'drizzle-orm'

/**
 * Seed: atribuições FGA → componente_atribuicoes
 *
 * Migra as ações hardcoded de AtribuirPermissoesSheet (ACOES dict) para a tabela
 * componente_atribuicoes, tornando-a a fonte de verdade para todos os tipos.
 *
 * Os IDs das atribuições são iguais às strings de ação FGA (ex: 'can_use_assistant')
 * para manter compatibilidade com component_permissions já salvos.
 */

type AtribSeed = { id: string; nome: string; modulo: string }

// ── Ações por tipo (espelho de ACOES em AtribuirPermissoesSheet.tsx) ──────────

const ASSISTENTE_IA: AtribSeed[] = [
  { id: 'can_use_assistant',              nome: 'Usar o assistente',                  modulo: 'Assistente de IA' },
  { id: 'can_share_conversation_results', nome: 'Compartilhar resultados de conversas', modulo: 'Assistente de IA' },
  { id: 'can_view_consulted_sources',     nome: 'Visualizar fontes consultadas',       modulo: 'Assistente de IA' },
  { id: 'can_upload_rag_sources',         nome: 'Upload de fontes RAG',                modulo: 'Assistente de IA' },
  { id: 'can_create_assistant',           nome: 'Criar assistente',                    modulo: 'Assistente de IA' },
  { id: 'can_configure_agents',           nome: 'Configurar agentes',                  modulo: 'Assistente de IA' },
  { id: 'can_manage_business_scenarios',  nome: 'Gerenciar cenários de negócio',       modulo: 'Assistente de IA' },
  { id: 'can_manage_users',               nome: 'Gerenciar usuários',                  modulo: 'Assistente de IA' },
]

const BASE_CONHECIMENTO: AtribSeed[] = [
  { id: 'pode_ler',                   nome: 'Ler documentos',              modulo: 'Base de Conhecimento' },
  { id: 'pode_editar',                nome: 'Editar conteúdo',             modulo: 'Base de Conhecimento' },
  { id: 'pode_criar_documento',       nome: 'Criar documentos',            modulo: 'Base de Conhecimento' },
  { id: 'pode_enviar_para_aprovacao', nome: 'Enviar para aprovação',       modulo: 'Base de Conhecimento' },
  { id: 'pode_aprovar',               nome: 'Aprovar documentos',          modulo: 'Base de Conhecimento' },
  { id: 'pode_publicar',              nome: 'Publicar documentos',         modulo: 'Base de Conhecimento' },
  { id: 'pode_excluir',               nome: 'Excluir',                     modulo: 'Base de Conhecimento' },
]

const ANALYTICS: AtribSeed[] = [
  { id: 'can_view_dashboards',   nome: 'Visualizar dashboards',  modulo: 'Analytics' },
  { id: 'can_export_reports',    nome: 'Exportar relatórios',    modulo: 'Analytics' },
  { id: 'can_manage_analytics',  nome: 'Administrar analytics',  modulo: 'Analytics' },
]

// ── Mapeamento de padrão de nome → lista de atribuições ───────────────────────

function inferirAtribuicoes(nome: string): AtribSeed[] | null {
  const n = nome.toLowerCase()
  if (n.includes('assistente') || n.includes('pas core') || n.includes('pas ') || n.includes('atendimento') || n.includes('financeiro') || n.includes('farmacêutico') || n.includes('design'))
    return ASSISTENTE_IA
  if (n.includes('base') || n.includes('knowledge') || n.includes('kb') || n.includes('jurídic') || n.includes('juridic'))
    return BASE_CONHECIMENTO
  if (n.includes('analytics') || n.includes('analytic') || n.includes('dashboard'))
    return ANALYTICS
  return null
}

async function seedAtribuicoesParaComponente(comp: { id: string; nome: string }, atribs: AtribSeed[]) {
  const existentes = await db.select().from(componenteAtribuicoes)
    .where(eq(componenteAtribuicoes.componenteId, comp.id))

  const existentesIds = new Set(existentes.map(a => a.id))
  let inseridos = 0

  for (const atrib of atribs) {
    const atribId = `${comp.id}--${atrib.id}`  // componenteId prefixado para unicidade global
    if (existentesIds.has(atribId)) continue
    // Verifica se já existe por nome também (evita duplicata de re-runs sem prefixo)
    if (existentes.some(e => e.nome === atrib.nome)) continue

    await db.insert(componenteAtribuicoes).values({
      id: atribId,
      componenteId: comp.id,
      nome: atrib.nome,
      descricao: null,
      modulo: atrib.modulo,
      status: 'Ativo',
      createdAt: new Date().toISOString(),
    })
    inseridos++
    console.log(`    + ${atrib.nome}`)
  }

  console.log(`  Inseridas: ${inseridos} · Já existiam: ${atribs.length - inseridos}`)
}

async function seed() {
  console.log('=== Seed: atribuições FGA → componente_atribuicoes ===\n')

  const todos = await db.select().from(componentes)

  // Filtra apenas FGA (ignora docnix e UUIDs de teste)
  const fgaComps = todos.filter(c => {
    const tm = (c as any).tipoModelo ?? 'fga'
    return tm === 'fga' && /^(comp-|[0-9a-f-]{36}$)/.test(c.id)
  })

  for (const comp of fgaComps) {
    const atribs = inferirAtribuicoes(comp.nome)
    if (!atribs) {
      console.log(`⚠️  ${comp.nome} (${comp.id}) — tipo não reconhecido, pulando`)
      continue
    }
    console.log(`\n--- ${comp.nome} (${comp.id}) — ${atribs.length} atribuições ---`)
    await seedAtribuicoesParaComponente(comp, atribs)
  }

  console.log('\n✅ Seed FGA concluído.')
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
