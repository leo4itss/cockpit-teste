// ── Tipos do módulo de autorização (FGA local) ─────────────────────────────
// Simula o modelo OpenFGA localmente, sem dependência de servidor externo.
// Em produção, substituir as chamadas ao engine por chamadas à API do OpenFGA.

// Papéis em Organization
// define platform_admin / org_admin / pas_architect / member
export type OrgRole = 'platform_admin' | 'org_admin' | 'pas_architect' | 'member'

// Papéis em Account
// define account_admin / member
export type AccountRole = 'account_admin' | 'member'

// Papéis em Component
// define viewer / editor / manager
export type ComponentRole = 'viewer' | 'editor' | 'manager'

// Papéis em Contract
// define viewer / manager
export type ContractRole = 'viewer' | 'manager'

// ── Estado de relações FGA ─────────────────────────────────────────────────
// Equivale ao conjunto de tuplas armazenadas no OpenFGA.
// Cada campo representa um "define" do modelo.
export interface FGARelations {

  // type user — global
  // define platform_admin: [user]
  platformAdmins: string[]                                        // userId[]

  // type organization
  // define org_admin: [user]
  orgAdmins:    { userId: string; orgId: string }[]
  // define pas_architect: [user]
  pasArchitects: { userId: string; orgId: string }[]
  // define member: [user] (parte direta — sem grupos)
  orgMembers:   { userId: string; orgId: string }[]

  // type account
  // define account_admin: [user]
  accountAdmins:  { userId: string; accountId: string }[]
  // define member: [user] (parte direta — sem grupos)
  accountMembers: { userId: string; accountId: string }[]

  // type component — direct roles
  // define viewer/editor/manager: [user, group#member]
  componentRoles: { userId: string; componentId: string; role: ComponentRole }[]

  // type contract — direct roles
  // define viewer/manager: [user]
  contractRoles: { userId: string; contractId: string; role: ContractRole }[]

  // ── Relações de grupo ────────────────────────────────────────────────────
  // type group — define member: [user]
  groupMembers: { userId: string; groupId: string }[]

  // group#member → organization (papéis que o grupo tem na org)
  groupOrgRoles: { groupId: string; orgId: string; role: OrgRole }[]

  // group#member → account
  groupAccountRoles: { groupId: string; accountId: string; role: AccountRole }[]

  // group#member → component
  groupComponentRoles: { groupId: string; componentId: string; role: ComponentRole }[]
}

// ── Persona de teste ───────────────────────────────────────────────────────
// Cada persona representa um cenário de teste diferente.
export interface Persona {
  userId: string
  label: string         // ex: "Platform Admin"
  description: string   // ex: "Leonardo — acesso global a tudo"
  color: string         // cor do avatar no switcher
}
