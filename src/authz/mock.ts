/**
 * Mock de relações FGA e personas de teste.
 *
 * IDs alinhados com src/data/mock.ts e server/seed.ts:
 *   Orgs:     '1'=Apple  '2'=Santacruz  '3'=Margatastiltda  '4'=Nadapedra  '5'=Agropocereal
 *             'org-docnix'=Docnix
 *   Accounts: 'a1'=Apple 'a2'=Santacruz 'a3'=Margatastiltda ... 'acc-comgas'=Comgas (Docnix)
 *   Users:    '1'=Leonardo  '2'=Ana  '3'=Marcelo  '4'=Carla  'usr-marcelo-c'=Marcelo Ribeiro
 *
 * Não existe em produção — apenas para demonstração do PoC.
 */

import type { FGARelations, Persona } from '@/types'

// ── Relações FGA ──────────────────────────────────────────────

export const mockFGARelations: FGARelations = {

  // ── Platform Admin ──────────────────────────────────────────
  // Leonardo (id='1'): acesso irrestrito a tudo.
  platformAdmins: ['1'],

  // ── Org Admin ───────────────────────────────────────────────
  // Ana (id='2'): org_admin da Org '1' (Apple).
  // → pode gerenciar contas, usuários, grupos e contratos da Apple.
  // → também é account_admin da conta 'a1' (herdado do papel de Org Admin no PoC).
  // Marcelo Ribeiro (id='usr-marcelo-c'): org_admin da Org 'org-docnix' (Docnix).
  // → gerencia a conta Comgas (acc-comgas) com usuários Fernando, Neide, Leo.
  // → solução Atlas com funcionalidade Chat e Assistente Vanessa IA.
  orgAdmins: [
    { userId: '2',            orgId: '1'          },
    { userId: 'usr-marcelo-c', orgId: 'org-docnix' },
  ],

  // ── PAS Architect ────────────────────────────────────────────
  // Marcelo (id='3'): pas_architect da Org '1' (Apple).
  // → pode ver orgs e gerenciar componentes.
  // → NÃO vê gestão de usuários, grupos, contas ou contratos.
  pasArchitects: [
    { userId: '3', orgId: '1' },
  ],

  // ── Account Admin ────────────────────────────────────────────
  // Ana (id='2'): account_admin da conta 'a1' (Apple).
  // Carla (id='4'): account_admin da conta 'a2' (Santacruz).
  //   → Carla só enxerga a conta a2 — não vê outras contas, org inteira nem contratos.
  accountAdmins: [
    { userId: '2', accountId: 'a1' },
    { userId: '4', accountId: 'a2' },
  ],

  // ── Members ──────────────────────────────────────────────────
  // Membros diretos de conta (sem papel de admin).
  // Populados dinamicamente via user_account_memberships no banco real.
  accountMembers: [],

  // ── Group Members ────────────────────────────────────────────
  // Populados dinamicamente via usuario_grupos no banco real.
  groupMembers: [],

  // ── Instance Members ─────────────────────────────────────────
  // Relações FGA user/group → instance para o cenário Docnix/Comgas.
  // Espelha os dados inseridos em server/seed-docnix.ts (steps 11-12)
  // e server/seed-marcelo-docnix.ts (step 4).
  instanceMembers: [
    // inst-vanessa: Fernando e Neide podem acessar (viewer)
    //   + Analistas de Qualidade (admin: criar/editar/excluir conversas)
    //   + Vendedores (member: criar/editar conversas)
    { entityType: 'user',  entityId: 'u-fernando',      instanceId: 'inst-vanessa',         role: 'viewer' },
    { entityType: 'user',  entityId: 'u-neide',         instanceId: 'inst-vanessa',         role: 'viewer' },
    { entityType: 'group', entityId: 'grp-comgas-aq',   instanceId: 'inst-vanessa',         role: 'admin'  },
    { entityType: 'group', entityId: 'grp-comgas-vend', instanceId: 'inst-vanessa',         role: 'member' },
    // inst-ceo: Marcelo usa, grupo Analistas só visualiza
    { entityType: 'user',  entityId: 'u-marcelo',     instanceId: 'inst-ceo',             role: 'member' },
    { entityType: 'group', entityId: 'g-analistas',   instanceId: 'inst-ceo',             role: 'viewer' },
    // inst-ws-vendas: grupo Vendedores usa, Fernando visualiza
    { entityType: 'group', entityId: 'g-vendedores',  instanceId: 'inst-ws-vendas',       role: 'member' },
    { entityType: 'user',  entityId: 'u-fernando',    instanceId: 'inst-ws-vendas',       role: 'viewer' },
    // inst-ws-fornecedores: grupo Fornecedores usa
    { entityType: 'group', entityId: 'g-fornecedores',instanceId: 'inst-ws-fornecedores', role: 'member' },
    // inst-dash-ops: grupo Analistas visualiza, Marcelo usa
    { entityType: 'group', entityId: 'g-analistas',   instanceId: 'inst-dash-ops',        role: 'viewer' },
    { entityType: 'user',  entityId: 'u-marcelo',     instanceId: 'inst-dash-ops',        role: 'member' },
  ],

  // ── Hierarquia de Grupos ──────────────────────────────────────
  // Hierarquia de grupos mock (ex: "Gestores de Riscos" → pai "Administradores DocNix")
  grupoParents: [
    { grupoId: 'grupo-gestores-riscos', parentId: 'grupo-admins-docnix' },
  ],

  // ── Atribuições de Instância ──────────────────────────────────
  // Atribuições de instância mock
  instanciaAtribuicoes: [
    // inst-vanessa: usuário 1 tem 'Visualizar' e 'Usar'
    { instanceId: 'inst-vanessa', entityType: 'user', entityId: '1', atribuicaoId: 'atrib-maxdoc-visualizar' },
    { instanceId: 'inst-vanessa', entityType: 'user', entityId: '1', atribuicaoId: 'atrib-maxdoc-usar' },
    // inst-ws-vendas: grupo com 'Visualizar'
    { instanceId: 'inst-ws-vendas', entityType: 'group', entityId: 'grupo-admins-docnix', atribuicaoId: 'atrib-maxdoc-visualizar' },
  ],
}

// ── Personas de teste ─────────────────────────────────────────

export const mockPersonas: Persona[] = [
  {
    userId: '1',
    label: 'Platform Admin',
    description: 'Leonardo — acesso irrestrito a todas as orgs e recursos',
    color: 'from-orange-400 to-red-500',
  },
  {
    userId: '2',
    label: 'Org Admin',
    description: 'Ana — admin da Org Apple; também account_admin da conta Apple',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    userId: '3',
    label: 'PAS Architect',
    description: 'Marcelo — gerencia componentes; não vê contas, usuários ou contratos',
    color: 'from-green-400 to-teal-500',
  },
  {
    userId: '4',
    label: 'Account Admin',
    description: 'Carla — admin restrita à conta Santacruz (a2)',
    color: 'from-purple-400 to-violet-500',
  },
  {
    userId: 'usr-marcelo-c',
    label: 'Org Admin (Docnix)',
    description: 'Marcelo Ribeiro — admin da Org Docnix; gerencia conta Comgas com solução Atlas e Assistente Vanessa IA',
    color: 'from-rose-400 to-pink-500',
  },
]

// ── Níveis de acesso na conta ─────────────────────────────────
// Esses são os únicos dois papéis gerenciados pelo Cockpit a nível de conta.
// Correspondem a UserAccountMembership.papel no banco.
// Distinto dos papéis de instância (FGA Server), que variam por componente.

export type NivelContaDef = {
  value: 'member' | 'account_admin'
  label: string
  desc: string
  cls: string
}

export const NIVEIS_CONTA: readonly NivelContaDef[] = [
  {
    value: 'member',
    label: 'Membro',
    desc:  'Acesso básico à conta e seus recursos',
    cls:   'bg-gray-50 text-gray-700 border-gray-200',
  },
  {
    value: 'account_admin',
    label: 'Administrador de conta',
    desc:  'Gerencia usuários e grupos desta conta',
    cls:   'bg-orange-50 text-orange-700 border-orange-200',
  },
] as const

// ── Papéis disponíveis (consumidos do FGA) ────────────────────
//
// Em produção, esta lista seria obtida via API do OpenFGA para a
// solução/conta em questão. No PoC, é uma lista estática que
// simula o que o FGA exporia.
//
// O Cockpit nunca permite criar ou editar papéis — apenas selecioná-los.

export const mockPapeisDisponiveis: {
  value: string
  label: string
  desc: string
  cls: string
}[] = [
  {
    value: 'Viewer',
    label: 'Visualizador',
    desc: 'Acesso de leitura e consulta',
    cls: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  {
    value: 'User',
    label: 'Usuário',
    desc: 'Uso padrão da solução',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    value: 'Admin',
    label: 'Administrador',
    desc: 'Acesso completo à gestão',
    cls: 'bg-orange-50 text-orange-700 border-orange-200',
  },
]

// ── Papéis estruturados para objetos DocNix ───────────────────
//
// Cada papel agrupa um conjunto de atribuições granulares.
// `atribuicaoNomes` é matchado contra `atribuicao.nome` em runtime
// para resolver os IDs corretos sem depender de IDs fixos.
// `atribuicaoNomes: []` (Administrador) = seleciona TODAS as atribuições ativas.

export const mockDocNixPapeis: {
  value: string
  label: string
  desc: string
  cls: string
  modulo: 'MaxDoc' | 'DocAction'
  atribuicaoNomes: string[]
}[] = [
  // ── MaxDoc ────────────────────────────────────────────────
  {
    value: 'leitor',
    label: 'Leitor',
    modulo: 'MaxDoc',
    desc: 'Leitura e download de documentos',
    cls: 'bg-gray-100 text-gray-600 border-gray-200',
    atribuicaoNomes: [
      'Visualizar', 'Ler Todos', 'Leitor Documento', 'Leitor Anexos',
      'Download Documento', 'Imprimir',
    ],
  },
  {
    value: 'editor',
    label: 'Editor',
    modulo: 'MaxDoc',
    desc: 'Cria e edita documentos e anexos',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    atribuicaoNomes: [
      'Visualizar', 'Ler Todos', 'Leitor Documento', 'Leitor Anexos',
      'Download Documento', 'Imprimir',
      'Criar Documento', 'Editar Documento', 'Nova Versão',
      'Upload Documento', 'Editor Documento',
      'Criar Anexo', 'Editar Anexo', 'Anexar Arquivos',
    ],
  },
  {
    value: 'revisor',
    label: 'Revisor',
    modulo: 'MaxDoc',
    desc: 'Revisa e submete documentos para aprovação',
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    atribuicaoNomes: [
      'Visualizar', 'Ler Todos', 'Leitor Documento', 'Leitor Anexos',
      'Download Documento', 'Imprimir',
      'Criar Documento', 'Editar Documento', 'Nova Versão',
      'Upload Documento', 'Editor Documento',
      'Criar Anexo', 'Editar Anexo', 'Anexar Arquivos',
      'Revisar Documento', 'Submeter para Aprovação',
      'Revisor Documento', 'Revisar como Substituto Documento',
    ],
  },
  {
    value: 'aprovador',
    label: 'Aprovador',
    modulo: 'MaxDoc',
    desc: 'Aprova, obsoleta e emite cópias controladas',
    cls: 'bg-orange-50 text-orange-700 border-orange-200',
    atribuicaoNomes: [
      'Visualizar', 'Ler Todos', 'Leitor Documento', 'Leitor Anexos',
      'Download Documento', 'Imprimir', 'Assinatura Eletrônica',
      'Revisar Documento', 'Aprovar Documento',
      'Aprovador Documento', 'Aprovador Substituto Documento',
      'Obsoletetar Documento',
      'Emitir Cópia Controlada', 'Emitir Cópia Não Controlada',
      'Cópia Controlada Anexos', 'Ciclo de Aprovação Documentos',
    ],
  },
  {
    value: 'admin-maxdoc',
    label: 'Administrador',
    modulo: 'MaxDoc',
    desc: 'Acesso completo ao MaxDoc',
    cls: 'bg-red-50 text-red-700 border-red-200',
    atribuicaoNomes: [], // vazio = todas as atribuições ativas
  },
  // ── DocAction ─────────────────────────────────────────────
  {
    value: 'colaborador',
    label: 'Colaborador',
    modulo: 'DocAction',
    desc: 'Cria e acompanha ocorrências',
    cls: 'bg-green-50 text-green-700 border-green-200',
    atribuicaoNomes: [
      'Visualizar', 'Criar Ocorrência', 'Criar Ocorrência 8D',
      'Editar Ocorrência', 'Vincular Ocorrência', 'Acompanhar Ocorrência',
    ],
  },
  {
    value: 'analista',
    label: 'Analista',
    modulo: 'DocAction',
    desc: 'Categoriza, analisa e cria planos de ação',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    atribuicaoNomes: [
      'Visualizar', 'Criar Ocorrência', 'Criar Ocorrência 8D',
      'Editar Ocorrência', 'Vincular Ocorrência', 'Acompanhar Ocorrência',
      'Categorizar Ocorrência', 'Analisar Causa',
      'Criar Plano de Ação', 'Verificar Eficácia', 'Encaminhar Ocorrência',
    ],
  },
  {
    value: 'aprovador-docaction',
    label: 'Aprovador',
    modulo: 'DocAction',
    desc: 'Aprova análises e encerra ocorrências',
    cls: 'bg-orange-50 text-orange-700 border-orange-200',
    atribuicaoNomes: [
      'Visualizar', 'Criar Ocorrência', 'Criar Ocorrência 8D',
      'Editar Ocorrência', 'Vincular Ocorrência', 'Acompanhar Ocorrência',
      'Categorizar Ocorrência', 'Analisar Causa',
      'Criar Plano de Ação', 'Verificar Eficácia', 'Encaminhar Ocorrência',
      'Aprovar Análise de Causa', 'Encerrar Ocorrência',
      'Reprogramar Prazo/Responsável',
    ],
  },
  {
    value: 'admin-docaction',
    label: 'Administrador',
    modulo: 'DocAction',
    desc: 'Acesso completo ao DocAction',
    cls: 'bg-red-50 text-red-700 border-red-200',
    atribuicaoNomes: [], // vazio = todas as atribuições ativas
  },
]

// ── Configuração unificada por tipo de componente ─────────────
//
// Cada componente define seus próprios papéis e ações.
// permissaoMode determina como as permissões são armazenadas:
//   'atribuicoes'          → instancia_membro_atribuicoes (DocNix)
//   'component_permissions'→ component_permissions (FGA genérico)
//
// Todos seguem a mesma metodologia FGA — o que varia é o contrato
// de papéis/ações de cada tipo de componente.

export type PapelDef = {
  value: string
  label: string
  desc: string
  cls: string
  // Ações padrão concedidas por este papel.
  // [] = TODAS as ações de config.acoes (padrão Administrador)
  defaultAcoes?: string[]
}

export type AcaoDef = {
  acao: string
  label: string
}

export type ComponenteTypeConfig = {
  label: string
  permissaoMode: 'component_permissions'
  papeis: PapelDef[]
  acoes?: AcaoDef[]
}

const COMPONENTE_CONFIGS: Record<string, ComponenteTypeConfig> = {

  // ── MaxDoc ────────────────────────────────────────────────────
  'maxdoc': {
    label: 'MaxDoc',
    permissaoMode: 'atribuicoes',
    papeis: [
      {
        value: 'leitor', label: 'Leitor', desc: 'Leitura e download de documentos',
        cls: 'bg-gray-100 text-gray-600 border-gray-200',
        atribuicaoNomes: ['Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Download Documento','Imprimir'],
      },
      {
        value: 'editor', label: 'Editor', desc: 'Cria e edita documentos e anexos',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        atribuicaoNomes: ['Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Download Documento','Imprimir','Criar Documento','Editar Documento','Nova Versão','Upload Documento','Editor Documento','Criar Anexo','Editar Anexo','Anexar Arquivos'],
      },
      {
        value: 'revisor', label: 'Revisor', desc: 'Revisa e submete documentos para aprovação',
        cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        atribuicaoNomes: ['Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Download Documento','Imprimir','Criar Documento','Editar Documento','Nova Versão','Upload Documento','Editor Documento','Criar Anexo','Editar Anexo','Anexar Arquivos','Revisar Documento','Submeter para Aprovação','Revisor Documento','Revisar como Substituto Documento'],
      },
      {
        value: 'aprovador', label: 'Aprovador', desc: 'Aprova, obsoleta e emite cópias controladas',
        cls: 'bg-orange-50 text-orange-700 border-orange-200',
        atribuicaoNomes: ['Visualizar','Ler Todos','Leitor Documento','Leitor Anexos','Download Documento','Imprimir','Assinatura Eletrônica','Revisar Documento','Aprovar Documento','Aprovador Documento','Aprovador Substituto Documento','Obsoletetar Documento','Emitir Cópia Controlada','Emitir Cópia Não Controlada','Cópia Controlada Anexos','Ciclo de Aprovação Documentos'],
      },
      {
        value: 'admin-maxdoc', label: 'Administrador', desc: 'Acesso completo ao MaxDoc',
        cls: 'bg-red-50 text-red-700 border-red-200',
        atribuicaoNomes: [],
      },
    ],
  },

  // ── DocAction ─────────────────────────────────────────────────
  'docaction': {
    label: 'DocAction',
    permissaoMode: 'atribuicoes',
    papeis: [
      {
        value: 'colaborador', label: 'Colaborador', desc: 'Cria e acompanha ocorrências',
        cls: 'bg-green-50 text-green-700 border-green-200',
        atribuicaoNomes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência'],
      },
      {
        value: 'analista', label: 'Analista', desc: 'Categoriza, analisa e cria planos de ação',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        atribuicaoNomes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência','Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência'],
      },
      {
        value: 'aprovador-docaction', label: 'Aprovador', desc: 'Aprova análises e encerra ocorrências',
        cls: 'bg-orange-50 text-orange-700 border-orange-200',
        atribuicaoNomes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência','Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência','Aprovar Análise de Causa','Encerrar Ocorrência','Reprogramar Prazo/Responsável'],
      },
      {
        value: 'admin-docaction', label: 'Administrador', desc: 'Acesso completo ao DocAction',
        cls: 'bg-red-50 text-red-700 border-red-200',
        atribuicaoNomes: [],
      },
    ],
  },

  // ── Assistente IA ─────────────────────────────────────────────
  'assistente-ia': {
    label: 'Assistente IA',
    permissaoMode: 'component_permissions',
    papeis: [
      {
        value: 'viewer', label: 'Visualizador', desc: 'Acesso somente leitura às conversas',
        cls: 'bg-gray-100 text-gray-600 border-gray-200',
        defaultAcoes: ['can_use_assistant'],
      },
      {
        value: 'member', label: 'Usuário', desc: 'Usa o assistente e compartilha resultados',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        defaultAcoes: ['can_use_assistant','can_share_conversation_results','can_view_consulted_sources','can_upload_rag_sources'],
      },
      {
        value: 'admin', label: 'Administrador', desc: 'Acesso completo — configura e gerencia',
        cls: 'bg-red-50 text-red-700 border-red-200',
        defaultAcoes: ['can_use_assistant','can_share_conversation_results','can_view_consulted_sources','can_upload_rag_sources','can_create_assistant','can_configure_agents','can_manage_business_scenarios','can_manage_users'],
      },
    ],
    acoes: [
      { acao: 'can_use_assistant',             label: 'Usar o assistente' },
      { acao: 'can_share_conversation_results', label: 'Compartilhar resultados' },
      { acao: 'can_view_consulted_sources',    label: 'Ver fontes consultadas' },
      { acao: 'can_upload_rag_sources',        label: 'Upload de fontes RAG' },
      { acao: 'can_create_assistant',          label: 'Criar assistente' },
      { acao: 'can_configure_agents',          label: 'Configurar agentes' },
      { acao: 'can_manage_business_scenarios', label: 'Gerenciar cenários de negócio' },
      { acao: 'can_manage_users',              label: 'Gerenciar usuários' },
    ],
  },

  // ── Analytics ─────────────────────────────────────────────────
  'analytics': {
    label: 'Analytics',
    permissaoMode: 'component_permissions',
    papeis: [
      {
        value: 'viewer', label: 'Visualizador', desc: 'Vê dashboards publicados',
        cls: 'bg-gray-100 text-gray-600 border-gray-200',
        defaultAcoes: ['can_view_dashboards'],
      },
      {
        value: 'member', label: 'Analista', desc: 'Visualiza e exporta relatórios',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        defaultAcoes: ['can_view_dashboards','can_export_reports'],
      },
      {
        value: 'admin', label: 'Administrador', desc: 'Gerencia dashboards e usuários',
        cls: 'bg-red-50 text-red-700 border-red-200',
        defaultAcoes: ['can_view_dashboards','can_export_reports','can_manage_analytics'],
      },
    ],
    acoes: [
      { acao: 'can_view_dashboards',  label: 'Visualizar dashboards' },
      { acao: 'can_export_reports',   label: 'Exportar relatórios' },
      { acao: 'can_manage_analytics', label: 'Administrar analytics' },
    ],
  },

  // ── Base de Conhecimento ──────────────────────────────────────
  'base-conhecimento': {
    label: 'Base de Conhecimento',
    permissaoMode: 'component_permissions',
    papeis: [
      {
        value: 'viewer', label: 'Leitor', desc: 'Lê documentos publicados',
        cls: 'bg-gray-100 text-gray-600 border-gray-200',
        defaultAcoes: ['pode_ler'],
      },
      {
        value: 'member', label: 'Editor', desc: 'Cria, edita e submete documentos',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        defaultAcoes: ['pode_ler','pode_criar_documento','pode_editar','pode_enviar_para_aprovacao'],
      },
      {
        value: 'admin', label: 'Administrador', desc: 'Aprova, publica e exclui documentos',
        cls: 'bg-red-50 text-red-700 border-red-200',
        defaultAcoes: ['pode_ler','pode_editar','pode_criar_documento','pode_enviar_para_aprovacao','pode_aprovar','pode_publicar','pode_excluir'],
      },
    ],
    acoes: [
      { acao: 'pode_ler',                   label: 'Ler documentos' },
      { acao: 'pode_editar',                label: 'Editar conteúdo' },
      { acao: 'pode_criar_documento',       label: 'Criar documentos' },
      { acao: 'pode_enviar_para_aprovacao', label: 'Enviar para aprovação' },
      { acao: 'pode_aprovar',               label: 'Aprovar documentos' },
      { acao: 'pode_publicar',              label: 'Publicar documentos' },
      { acao: 'pode_excluir',               label: 'Excluir' },
    ],
  },

  // ── Genérico / Fallback ───────────────────────────────────────
  'default': {
    label: 'Geral',
    permissaoMode: 'component_permissions',
    papeis: [
      {
        value: 'viewer', label: 'Visualizador', desc: 'Acesso de leitura e consulta',
        cls: 'bg-gray-100 text-gray-600 border-gray-200',
        defaultAcoes: ['can_view'],
      },
      {
        value: 'member', label: 'Usuário', desc: 'Uso padrão da solução',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        defaultAcoes: ['can_view','can_edit'],
      },
      {
        value: 'admin', label: 'Administrador', desc: 'Acesso completo à gestão',
        cls: 'bg-red-50 text-red-700 border-red-200',
        defaultAcoes: ['can_view','can_edit','can_manage'],
      },
    ],
    acoes: [
      { acao: 'can_view',   label: 'Visualizar' },
      { acao: 'can_edit',   label: 'Editar' },
      { acao: 'can_manage', label: 'Administrar' },
    ],
  },
}

/** Normaliza o nome de um componente para a chave de configuração. */
function normalizeComponenteKey(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('maxdoc'))                                              return 'maxdoc'
  if (n.includes('docaction'))                                           return 'docaction'
  if (n.includes('assistente') || n.includes('pas core'))               return 'assistente-ia'
  if (n.includes('analytics') || n.includes('analytic'))                return 'analytics'
  if (n.includes('base') || n.includes('knowledge') || n.includes('kb')) return 'base-conhecimento'
  return 'default'
}

/**
 * Retorna a configuração de papéis e ações para um tipo de componente.
 * Usa o nome do componente como discriminador primário.
 * Fallback: configuração genérica ('default').
 */
export function getComponenteConfig(componenteNome: string): ComponenteTypeConfig {
  const key = normalizeComponenteKey(componenteNome)
  return COMPONENTE_CONFIGS[key] ?? COMPONENTE_CONFIGS['default']
}
