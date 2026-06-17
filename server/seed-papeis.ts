/**
 * Seed de papéis por componente para produção.
 * Idempotente — usa INSERT … ON CONFLICT (id) DO NOTHING.
 *
 * Execute com: npx tsx server/seed-papeis.ts
 *
 * Componentes cobertos:
 *   comp-maxdoc        → Leitor, Editor, Revisor, Aprovador, Administrador
 *   comp-docaction     → Colaborador, Analista, Aprovador, Administrador
 *   comp-assistente-ia → Visualizador, Membro, Administrador
 */
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const PAPEIS: {
  id: string; componente_id: string; value: string; label: string
  descricao: string; default_acoes: string[]; cls: string; ordem: number
}[] = [
  // ── MaxDoc ──────────────────────────────────────────────────────
  { id: 'papel-maxdoc-leitor',
    componente_id: 'comp-maxdoc', value: 'leitor', label: 'Leitor',
    descricao: 'Leitura e download de documentos',
    default_acoes: ['Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Baixar Documento','Imprimir'],
    cls: 'bg-gray-100 text-gray-600 border-gray-200', ordem: 1 },

  { id: 'papel-maxdoc-editor',
    componente_id: 'comp-maxdoc', value: 'editor', label: 'Editor',
    descricao: 'Cria e edita documentos e anexos',
    default_acoes: ['Visualizar','Criar Documento','Editar','Nova Versão','Mover','Cancelar Edição','Baixar Documento','Imprimir','Visualizar Histórico de Versões'],
    cls: 'bg-blue-50 text-blue-700 border-blue-200', ordem: 2 },

  { id: 'papel-maxdoc-revisor',
    componente_id: 'comp-maxdoc', value: 'revisor', label: 'Revisor',
    descricao: 'Revisa e submete documentos para aprovação',
    default_acoes: ['Visualizar','Revisar Documento','Submeter para Aprovação','Solicitar Revisão'],
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', ordem: 3 },

  { id: 'papel-maxdoc-aprovador',
    componente_id: 'comp-maxdoc', value: 'aprovador', label: 'Aprovador',
    descricao: 'Aprova, obsoleta e emite cópias controladas',
    default_acoes: ['Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Baixar Documento','Imprimir','Assinatura Eletrônica','Revisar Documento','Aprovar Documento','Rejeitar Documento','Aprovador Documento','Aprovador Substituto Documento','Obsoletetar Documento','Emitir Cópia Controlada','Emitir Cópia Não Controlada','Cópia Controlada Anexos','Ciclo de Aprovação Documentos'],
    cls: 'bg-orange-50 text-orange-700 border-orange-200', ordem: 4 },

  { id: 'papel-maxdoc-admin',
    componente_id: 'comp-maxdoc', value: 'admin-maxdoc', label: 'Administrador',
    descricao: 'Acesso completo ao MaxDoc',
    default_acoes: [],
    cls: 'bg-red-50 text-red-700 border-red-200', ordem: 5 },

  // ── DocAction ────────────────────────────────────────────────────
  { id: 'papel-da-colaborador',
    componente_id: 'comp-docaction', value: 'colaborador', label: 'Colaborador',
    descricao: 'Cria e acompanha ocorrências',
    default_acoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência'],
    cls: 'bg-green-50 text-green-700 border-green-200', ordem: 1 },

  { id: 'papel-da-analista',
    componente_id: 'comp-docaction', value: 'analista', label: 'Analista',
    descricao: 'Categoriza, analisa e cria planos de ação',
    default_acoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência','Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência'],
    cls: 'bg-blue-50 text-blue-700 border-blue-200', ordem: 2 },

  { id: 'papel-da-aprovador',
    componente_id: 'comp-docaction', value: 'aprovador-docaction', label: 'Aprovador',
    descricao: 'Aprova análises e encerra ocorrências',
    default_acoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência','Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência','Aprovar Análise de Causa','Encerrar Ocorrência','Reprogramar Prazo/Responsável'],
    cls: 'bg-orange-50 text-orange-700 border-orange-200', ordem: 3 },

  { id: 'papel-da-admin',
    componente_id: 'comp-docaction', value: 'admin-docaction', label: 'Administrador',
    descricao: 'Acesso completo ao DocAction',
    default_acoes: [],
    cls: 'bg-red-50 text-red-700 border-red-200', ordem: 4 },

  // ── Assistente IA ────────────────────────────────────────────────
  { id: 'papel-ass-viewer',
    componente_id: 'comp-assistente-ia', value: 'viewer', label: 'Visualizador',
    descricao: 'Acesso somente leitura às conversas',
    default_acoes: ['can_use_assistant'],
    cls: 'bg-gray-100 text-gray-600 border-gray-200', ordem: 1 },

  { id: 'papel-ass-member',
    componente_id: 'comp-assistente-ia', value: 'member', label: 'Membro',
    descricao: 'Usa o assistente e compartilha resultados',
    default_acoes: ['can_use_assistant','can_share_conversation_results','can_view_consulted_sources','can_upload_rag_sources'],
    cls: 'bg-blue-50 text-blue-700 border-blue-200', ordem: 2 },

  { id: 'papel-ass-admin',
    componente_id: 'comp-assistente-ia', value: 'admin', label: 'Administrador',
    descricao: 'Acesso completo — configura e gerencia',
    default_acoes: ['can_use_assistant','can_share_conversation_results','can_view_consulted_sources','can_upload_rag_sources','can_create_assistant','can_configure_agents','can_manage_business_scenarios','can_manage_users'],
    cls: 'bg-red-50 text-red-700 border-red-200', ordem: 3 },
]

async function main() {
  console.log('🌱 Seeding componente_papeis...\n')

  let inserted = 0
  for (const p of PAPEIS) {
    const result = await sql`
      INSERT INTO componente_papeis
        (id, componente_id, value, label, descricao, default_acoes, cls, ordem, status, created_at)
      VALUES (
        ${p.id}, ${p.componente_id}, ${p.value}, ${p.label}, ${p.descricao},
        ${JSON.stringify(p.default_acoes)}::jsonb, ${p.cls}, ${p.ordem},
        'Ativo', to_char(current_date, 'DD/MM/YYYY')
      )
      ON CONFLICT (id) DO NOTHING
    `
    if ((result as any).rowCount > 0) inserted++
  }

  const skipped = PAPEIS.length - inserted
  console.log(`✅ ${inserted} papel(éis) inserido(s) (${skipped} já existiam)`)
  console.log('\nComponentes cobertos:')
  console.log('  MaxDoc       → Leitor, Editor, Revisor, Aprovador, Administrador')
  console.log('  DocAction    → Colaborador, Analista, Aprovador, Administrador')
  console.log('  Assistente IA → Visualizador, Membro, Administrador')
}

main().catch(err => { console.error(err); process.exit(1) })
