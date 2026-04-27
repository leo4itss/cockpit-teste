// ── Estado FGA mockado para testes ─────────────────────────────────────────
// IDs reais usados no projeto:
//   Orgs:       '1'=Apple  '2'=Santacruz  '3'=Margatastiltda  '4'=Nadapedra  '5'=Agropocereal
//   Accounts:   'a1'=Apple 'a2'=Santacruz 'a3'=Margatastiltda ...
//   Users:      '1'=Leonardo (Administrador)  '2'=Ana (Gerente)  '3'=Marcelo (Arquiteto PAS)
//   Componentes:'comp-1'=PAS Core  'comp-2'=Knowledge Base
//   Grupo mock: 'grp-viewers'=Equipe Viewer (não persiste no backend, só existe aqui)

import type { FGARelations, Persona } from './types'

// ID do grupo mock usado para testar acesso via group#member
export const MOCK_GROUP_VIEWERS = 'grp-viewers'

// ── Relações FGA ────────────────────────────────────────────────────────────
export const mockFGARelations: FGARelations = {

  // User 1 (Leonardo) é platform_admin — acesso irrestrito a tudo
  platformAdmins: ['1'],

  // User 2 (Ana) é org_admin da Org '1' (Apple)
  // → pode gerenciar contas, contratos e visualizar a org
  orgAdmins: [
    { userId: '2', orgId: '1' },
  ],

  // User 3 (Marcelo) é pas_architect da Org '1' (Apple)
  // → pode gerenciar soluções e componentes, mas NÃO contas/contratos
  pasArchitects: [
    { userId: '3', orgId: '1' },
  ],

  // Nenhum membro direto de org neste mock
  orgMembers: [],

  // User 2 (Ana) é account_admin da conta 'a1' (Apple)
  // → pode gerenciar usuários e grupos dessa conta
  accountAdmins: [
    { userId: '2', accountId: 'a1' },
  ],

  accountMembers: [],

  // Papéis sobre componentes (direto por usuário)
  componentRoles: [
    // Marcelo gerencia o PAS Core → can_manage, can_edit, can_view
    { userId: '3', componentId: 'comp-1', role: 'manager' },
    // Marcelo só visualiza o Knowledge Base
    { userId: '3', componentId: 'comp-2', role: 'viewer' },
  ],

  // Ana pode ver e gerenciar contratos (por orgId via orgAdmins, mas aqui também direto)
  contractRoles: [],

  // ── Relações de grupo ────────────────────────────────────────────────────

  // User 2 (Ana) é membro do grupo 'grp-viewers'
  // Isso demonstra a regra: define member: [user, group#member]
  groupMembers: [
    { userId: '2', groupId: MOCK_GROUP_VIEWERS },
  ],

  // O grupo 'grp-viewers' tem papel 'member' na Org '2' (Santacruz)
  // → Ana visualiza Santacruz por conta do grupo, mesmo sem relação direta
  // Regra FGA: define can_view: member or org_admin or platform_admin
  groupOrgRoles: [
    { groupId: MOCK_GROUP_VIEWERS, orgId: '2', role: 'member' },
  ],

  // O grupo tem acesso de member na conta 'a2' (Santacruz)
  groupAccountRoles: [
    { groupId: MOCK_GROUP_VIEWERS, accountId: 'a2', role: 'member' },
  ],

  // O grupo pode visualizar o Knowledge Base
  // → Ana pode visualizar comp-2 via group#member
  groupComponentRoles: [
    { groupId: MOCK_GROUP_VIEWERS, componentId: 'comp-2', role: 'viewer' },
  ],
}

// ── Personas de teste ───────────────────────────────────────────────────────
// 3 cenários que cobrem os casos principais do modelo FGA.
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
    description: 'Ana — admin da Org Apple; membro da Org Santacruz via grupo',
    color: 'from-blue-400 to-indigo-500',
  },
  {
    userId: '3',
    label: 'PAS Architect',
    description: 'Marcelo — gerencia componentes; sem acesso a contas/contratos',
    color: 'from-green-400 to-teal-500',
  },
]
