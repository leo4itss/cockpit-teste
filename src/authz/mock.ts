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
