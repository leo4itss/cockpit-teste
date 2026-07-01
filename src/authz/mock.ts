/**
 * Mock de relações FGA e personas de teste.
 *
 * IDs alinhados com src/data/mock.ts e server/seed.ts:
 *   Orgs:     '1'=Apple  '2'=Santacruz  '3'=Margatastiltda  '4'=Nadapedra  '5'=Agropocereal
 *             'org-docnix'=Docnix
 *   Accounts: 'a1'=Apple 'a2'=Santacruz 'a3'=Margatastiltda ... 'acc-comgas'=Comgas (Docnix)
 *             'acc-elfa'=Hospital Elfa (Docnix) — cenário multi-empresa
 *   Users:    '1'=Leonardo  '2'=Ana  '3'=Marcelo  '4'=Carla  'usr-marcelo-c'=Marcelo Ribeiro
 *             'usr-carlos-elfa'=Carlos Mendes (Account Admin Hospital Elfa)
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
  // Carlos Mendes (usr-carlos-elfa): account_admin da conta 'acc-elfa' (Hospital Elfa).
  //   → Cenário multi-empresa Docnix: mesmo usuário com papéis diferentes por empresa (instância).
  accountAdmins: [
    { userId: '2',              accountId: 'a1'       },
    { userId: '4',              accountId: 'a2'       },
    { userId: 'usr-carlos-elfa', accountId: 'acc-elfa' },
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

    // ── Hospital Elfa (cenário multi-empresa MaxDoc) ──────────────
    // DEMONSTRAÇÃO DO DIFERENCIAL PAS vs Docnix:
    // Carlos é admin-maxdoc no Hospital Central, leitor na Unidade Norte,
    // e sem acesso à Unidade Sul — com o MESMO login.
    // No Docnix atual isso é impossível: o usuário herda as mesmas atribuições em todas as empresas.
    { entityType: 'user',  entityId: 'usr-carlos-elfa',    instanceId: 'inst-elfa-central', role: 'admin-maxdoc' },
    { entityType: 'user',  entityId: 'usr-carlos-elfa',    instanceId: 'inst-elfa-norte',   role: 'leitor'       },
    // Carlos NÃO tem acesso à inst-elfa-sul (Unidade Sul) — ausência intencional
    { entityType: 'group', entityId: 'grp-elfa-editores',  instanceId: 'inst-elfa-central', role: 'editor'       },
    { entityType: 'group', entityId: 'grp-elfa-editores',  instanceId: 'inst-elfa-norte',   role: 'editor'       },
    { entityType: 'group', entityId: 'grp-elfa-aprovadores', instanceId: 'inst-elfa-central', role: 'aprovador'  },
    { entityType: 'group', entityId: 'grp-elfa-aprovadores', instanceId: 'inst-elfa-norte',   role: 'aprovador'  },
    { entityType: 'user',  entityId: 'usr-beatriz-elfa',   instanceId: 'inst-elfa-sul',     role: 'leitor'       },
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
  {
    userId: 'usr-carlos-elfa',
    label: 'Account Admin (Hospital Elfa)',
    description: 'Carlos Mendes — admin da conta Hospital Elfa; demonstra papéis diferenciados por empresa (admin no Central, leitor no Norte, sem acesso no Sul)',
    color: 'from-cyan-400 to-teal-500',
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
      'Baixar Documento', 'Imprimir',
    ],
  },
  {
    value: 'editor',
    label: 'Editor',
    modulo: 'MaxDoc',
    desc: 'Cria e edita documentos e anexos',
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    atribuicaoNomes: [
      'Visualizar', 'Criar Documento', 'Editar', 'Nova Versão',
      'Mover', 'Cancelar Edição', 'Baixar Documento', 'Imprimir',
      'Visualizar Histórico de Versões',
    ],
  },
  {
    value: 'revisor',
    label: 'Revisor',
    modulo: 'MaxDoc',
    desc: 'Revisa e submete documentos para aprovação',
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    atribuicaoNomes: [
      'Visualizar', 'Revisar Documento', 'Submeter para Aprovação', 'Solicitar Revisão',
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
      'Baixar Documento', 'Imprimir', 'Assinatura Eletrônica',
      'Revisar Documento', 'Aprovar Documento', 'Rejeitar Documento',
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
// Todos os componentes usam component_permissions (FGA puro).
// Cada config define os papéis disponíveis e o catálogo completo
// de ações (acoes). defaultAcoes: [] = todas as ações do catálogo.

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
  /** true = acesso gerenciado por instância; false/ausente = permissão a nível de conta */
  acessoViaInstancia?: boolean
}

const COMPONENTE_CONFIGS: Record<string, ComponenteTypeConfig> = {

  // ── MaxDoc ────────────────────────────────────────────────────
  'maxdoc': {
    label: 'MaxDoc',
    permissaoMode: 'component_permissions',
    acessoViaInstancia: true,
    papeis: [
      {
        value: 'leitor', label: 'Leitor', desc: 'Leitura e download de documentos',
        cls: 'bg-gray-100 text-gray-600 border-gray-200',
        // Nomes alinhados com componente_atribuicoes no banco (12 atribuições MaxDoc)
        defaultAcoes: ['Ler Todos os Documentos', 'Imprimir'],
      },
      {
        value: 'editor', label: 'Editor', desc: 'Cria e edita documentos e anexos',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        defaultAcoes: ['Criar Documento', 'Editar Documento', 'Imprimir'],
      },
      {
        value: 'revisor', label: 'Revisor', desc: 'Revisa e submete documentos para aprovação',
        cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        defaultAcoes: ['Revisar Documento', 'Imprimir'],
      },
      {
        value: 'aprovador', label: 'Aprovador', desc: 'Aprova, obsoleta e emite cópias controladas',
        cls: 'bg-orange-50 text-orange-700 border-orange-200',
        defaultAcoes: ['Aprovar Documento', 'Revisar Documento', 'Obsoletetar Documento', 'Cópia Controlada', 'Emitir Cópia Não Controlada'],
      },
      {
        value: 'admin-maxdoc', label: 'Administrador', desc: 'Acesso completo ao MaxDoc',
        cls: 'bg-red-50 text-red-700 border-red-200',
        defaultAcoes: [], // [] = todas as ações (Administrar MaxDoc + todas as 12)
      },
    ],
    acoes: [
      { acao: 'Visualizar',                        label: 'Visualizar' },
      { acao: 'Ler Todos',                         label: 'Ler Todos' },
      { acao: 'Leitor Documento',                  label: 'Leitor Documento' },
      { acao: 'Leitor Anexos',                     label: 'Leitor Anexos' },
      { acao: 'Baixar Documento',                  label: 'Baixar Documento' },
      { acao: 'Imprimir',                          label: 'Imprimir' },
      { acao: 'Criar Documento',                   label: 'Criar Documento' },
      { acao: 'Editar',                            label: 'Editar' },
      { acao: 'Nova Versão',                       label: 'Nova Versão' },
      { acao: 'Mover',                             label: 'Mover' },
      { acao: 'Cancelar Edição',                   label: 'Cancelar Edição' },
      { acao: 'Visualizar Histórico de Versões',   label: 'Visualizar Histórico de Versões' },
      { acao: 'Upload Documento',                  label: 'Upload Documento' },
      { acao: 'Editor Documento',                  label: 'Editor Documento' },
      { acao: 'Criar Anexo',                       label: 'Criar Anexo' },
      { acao: 'Editar Anexo',                      label: 'Editar Anexo' },
      { acao: 'Anexar Arquivos',                   label: 'Anexar Arquivos' },
      { acao: 'Assinatura Eletrônica',             label: 'Assinatura Eletrônica' },
      { acao: 'Revisar Documento',                 label: 'Revisar Documento' },
      { acao: 'Submeter para Aprovação',           label: 'Submeter para Aprovação' },
      { acao: 'Solicitar Revisão',                 label: 'Solicitar Revisão' },
      { acao: 'Revisor Documento',                 label: 'Revisor Documento' },
      { acao: 'Revisar como Substituto Documento', label: 'Revisar como Substituto Documento' },
      { acao: 'Aprovar Documento',                 label: 'Aprovar Documento' },
      { acao: 'Rejeitar Documento',                label: 'Rejeitar Documento' },
      { acao: 'Aprovador Documento',               label: 'Aprovador Documento' },
      { acao: 'Aprovador Substituto Documento',    label: 'Aprovador Substituto Documento' },
      { acao: 'Obsoletetar Documento',             label: 'Obsoletetar Documento' },
      { acao: 'Emitir Cópia Controlada',           label: 'Emitir Cópia Controlada' },
      { acao: 'Emitir Cópia Não Controlada',       label: 'Emitir Cópia Não Controlada' },
      { acao: 'Cópia Controlada Anexos',           label: 'Cópia Controlada Anexos' },
      { acao: 'Ciclo de Aprovação Documentos',     label: 'Ciclo de Aprovação Documentos' },
    ],
  },

  // ── DocAction ─────────────────────────────────────────────────
  'docaction': {
    label: 'DocAction',
    permissaoMode: 'component_permissions',
    acessoViaInstancia: true,
    papeis: [
      {
        value: 'colaborador', label: 'Colaborador', desc: 'Cria e acompanha ocorrências',
        cls: 'bg-green-50 text-green-700 border-green-200',
        defaultAcoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência'],
      },
      {
        value: 'analista', label: 'Analista', desc: 'Categoriza, analisa e cria planos de ação',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        defaultAcoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência','Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência'],
      },
      {
        value: 'aprovador-docaction', label: 'Aprovador', desc: 'Aprova análises e encerra ocorrências',
        cls: 'bg-orange-50 text-orange-700 border-orange-200',
        defaultAcoes: ['Visualizar','Criar Ocorrência','Criar Ocorrência 8D','Editar Ocorrência','Vincular Ocorrência','Acompanhar Ocorrência','Categorizar Ocorrência','Analisar Causa','Criar Plano de Ação','Verificar Eficácia','Encaminhar Ocorrência','Aprovar Análise de Causa','Encerrar Ocorrência','Reprogramar Prazo/Responsável'],
      },
      {
        value: 'admin-docaction', label: 'Administrador', desc: 'Acesso completo ao DocAction',
        cls: 'bg-red-50 text-red-700 border-red-200',
        defaultAcoes: [], // [] = todas as ações de config.acoes
      },
    ],
    acoes: [
      { acao: 'Visualizar',                    label: 'Visualizar' },
      { acao: 'Criar Ocorrência',              label: 'Criar Ocorrência' },
      { acao: 'Criar Ocorrência 8D',           label: 'Criar Ocorrência 8D' },
      { acao: 'Editar Ocorrência',             label: 'Editar Ocorrência' },
      { acao: 'Vincular Ocorrência',           label: 'Vincular Ocorrência' },
      { acao: 'Acompanhar Ocorrência',         label: 'Acompanhar Ocorrência' },
      { acao: 'Categorizar Ocorrência',        label: 'Categorizar Ocorrência' },
      { acao: 'Analisar Causa',                label: 'Analisar Causa' },
      { acao: 'Criar Plano de Ação',           label: 'Criar Plano de Ação' },
      { acao: 'Verificar Eficácia',            label: 'Verificar Eficácia' },
      { acao: 'Encaminhar Ocorrência',         label: 'Encaminhar Ocorrência' },
      { acao: 'Aprovar Análise de Causa',      label: 'Aprovar Análise de Causa' },
      { acao: 'Encerrar Ocorrência',           label: 'Encerrar Ocorrência' },
      { acao: 'Reprogramar Prazo/Responsável', label: 'Reprogramar Prazo/Responsável' },
    ],
  },

  // ── Assistente IA ─────────────────────────────────────────────
  'assistente-ia': {
    label: 'Assistente IA',
    permissaoMode: 'component_permissions',
    acessoViaInstancia: true,
    papeis: [
      {
        value: 'viewer', label: 'Visualizador', desc: 'Acesso somente leitura às conversas',
        cls: 'bg-gray-100 text-gray-600 border-gray-200',
        defaultAcoes: ['can_use_assistant'],
      },
      {
        value: 'member', label: 'Membro', desc: 'Usa o assistente e compartilha resultados',
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
    acessoViaInstancia: true,
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
    acessoViaInstancia: true,
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
        value: 'member', label: 'Membro', desc: 'Uso padrão da solução',
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

/**
 * Busca informações de exibição de um papel em todos os componentes.
 * Útil quando o Grupo guarda só o value do papel sem saber qual componente o definiu.
 * Retorna o primeiro match encontrado; em caso de conflito de value entre componentes,
 * prioriza pela ordem de definição em COMPONENTE_CONFIGS.
 */
export function getPapelInfo(value: string): { label: string; cls: string } | undefined {
  if (!value) return undefined
  for (const cfg of Object.values(COMPONENTE_CONFIGS)) {
    const found = cfg.papeis.find(p => p.value === value)
    if (found) return { label: found.label, cls: found.cls }
  }
  return undefined
}
