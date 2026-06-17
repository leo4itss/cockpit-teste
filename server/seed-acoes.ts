/**
 * Seed do catálogo de ações FGA por componente.
 * Idempotente — usa INSERT … ON CONFLICT (id) DO NOTHING.
 *
 * Execute com: npx tsx server/seed-acoes.ts
 *
 * Componentes cobertos:
 *   comp-maxdoc        → 32 ações
 *   comp-docaction     → 14 ações
 *   comp-assistente-ia →  8 ações
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const MAXDOC_ACOES = [
  'Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Baixar Documento','Imprimir',
  'Criar Documento','Editar','Nova Versão','Mover','Cancelar Edição','Visualizar Histórico de Versões',
  'Upload Documento','Editor Documento','Criar Anexo','Editar Anexo','Anexar Arquivos',
  'Assinatura Eletrônica','Revisar Documento','Submeter para Aprovação','Solicitar Revisão',
  'Revisor Documento','Revisar como Substituto Documento',
  'Aprovar Documento','Rejeitar Documento','Aprovador Documento','Aprovador Substituto Documento',
  'Obsoletetar Documento','Emitir Cópia Controlada','Emitir Cópia Não Controlada',
  'Cópia Controlada Anexos','Ciclo de Aprovação Documentos',
]

const DOCACTION_ACOES = [
  'Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência',
  'Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência',
  'Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência',
  'Aprovar Análise de Causa','Encerrar Ocorrência','Reprogramar Prazo/Responsável',
]

const ASSISTENTE_ACOES: { acao: string; label: string }[] = [
  { acao: 'can_use_assistant',              label: 'Usar o assistente' },
  { acao: 'can_share_conversation_results', label: 'Compartilhar resultados' },
  { acao: 'can_view_consulted_sources',     label: 'Ver fontes consultadas' },
  { acao: 'can_upload_rag_sources',         label: 'Upload de fontes RAG' },
  { acao: 'can_create_assistant',           label: 'Criar assistente' },
  { acao: 'can_configure_agents',           label: 'Configurar agentes' },
  { acao: 'can_manage_business_scenarios',  label: 'Gerenciar cenários de negócio' },
  { acao: 'can_manage_users',               label: 'Gerenciar usuários' },
]

const ROWS: { id: string; componente_id: string; acao: string; label: string; ordem: number }[] = [
  ...MAXDOC_ACOES.map((a, i) => ({ id: `acao-maxdoc-${i + 1}`,    componente_id: 'comp-maxdoc',        acao: a, label: a, ordem: i + 1 })),
  ...DOCACTION_ACOES.map((a, i) => ({ id: `acao-docaction-${i + 1}`, componente_id: 'comp-docaction',     acao: a, label: a, ordem: i + 1 })),
  ...ASSISTENTE_ACOES.map((e, i) => ({ id: `acao-ass-${i + 1}`,      componente_id: 'comp-assistente-ia', acao: e.acao, label: e.label, ordem: i + 1 })),
]

async function main() {
  console.log('🌱 Seeding componente_acoes...\n')

  let inserted = 0
  for (const r of ROWS) {
    await sql`
      INSERT INTO componente_acoes (id, componente_id, acao, label, ordem, status, created_at)
      VALUES (
        ${r.id}, ${r.componente_id}, ${r.acao}, ${r.label}, ${r.ordem},
        'Ativo', to_char(current_date, 'DD/MM/YYYY')
      )
      ON CONFLICT (id) DO NOTHING
    `
    inserted++
  }

  console.log(`✅ ${inserted} ação(ões) processada(s)`)
  console.log('\nComponentes cobertos:')
  console.log('  MaxDoc        → 32 ações')
  console.log('  DocAction     → 14 ações')
  console.log('  Assistente IA →  8 ações')
}

main().catch(err => { console.error(err); process.exit(1) })
