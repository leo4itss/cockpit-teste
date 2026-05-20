/**
 * Engine de autorização FGA (local/mock).
 *
 * Funções puras que avaliam permissões com base em FGARelations.
 * Sem side effects, sem React — testável de forma isolada.
 *
 * Em produção: substituir o corpo de cada função por chamada ao
 * SDK do OpenFGA:
 *   await fga.check({ user: `user:${userId}`, relation, object })
 *
 * Modelo de relações (ReBAC):
 *   platform_admin → acesso irrestrito a tudo
 *   org_admin      → gerencia org, contas, usuários e grupos da org
 *   pas_architect  → gerencia componentes; vê orgs mas não contas/contratos
 *   account_admin  → gerencia usuários e grupos da conta que administra
 *   member         → acesso básico de leitura à conta
 */

import type { FGARelations } from '@/types'

// ── Helpers internos ──────────────────────────────────────────

function isPlatformAdmin(userId: string, rel: FGARelations): boolean {
  return rel.platformAdmins.includes(userId)
}

function isOrgAdmin(userId: string, orgId: string, rel: FGARelations): boolean {
  return rel.orgAdmins.some(r => r.userId === userId && r.orgId === orgId)
}

function isPasArchitect(userId: string, orgId: string, rel: FGARelations): boolean {
  return rel.pasArchitects.some(r => r.userId === userId && r.orgId === orgId)
}

function isAccountAdmin(userId: string, accountId: string, rel: FGARelations): boolean {
  return rel.accountAdmins.some(r => r.userId === userId && r.accountId === accountId)
}

function isAccountMember(userId: string, accountId: string, rel: FGARelations): boolean {
  return rel.accountMembers.some(r => r.userId === userId && r.accountId === accountId)
}

// ── Organização ───────────────────────────────────────────────

/**
 * Pode visualizar a organização e suas contas/soluções/contratos.
 * FGA: user:<id> can_view organization:<orgId>
 *   define can_view: platform_admin or org_admin or pas_architect
 */
export function canViewOrganization(
  userId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  if (isPasArchitect(userId, orgId, rel)) return true
  return false
}

/**
 * Pode criar organizações (exclusivo Platform Admin).
 * FGA: user:<id> can_create organization
 */
export function canCreateOrganization(userId: string, rel: FGARelations): boolean {
  return isPlatformAdmin(userId, rel)
}

/**
 * Pode gerenciar contas dentro da org (criar, editar, inativar).
 * FGA: user:<id> can_manage_accounts organization:<orgId>
 *   define can_manage_accounts: platform_admin or org_admin
 */
export function canManageAccounts(
  userId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  return false
}

/**
 * Pode convidar usuário para a organização (sem conta específica).
 * FGA: user:<id> can_invite organization:<orgId>
 *   define can_invite: platform_admin or org_admin
 */
export function canInviteToOrg(
  userId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  return false
}

/**
 * Pode promover um usuário a Org Admin (Criar Org Admin).
 * FGA: user:<id> can_assign_org_admin organization:<orgId>
 *   define can_assign_org_admin: platform_admin
 *
 * Apenas Platform Admin promove Org Admin — o Org Admin promove Account Admin.
 */
export function canAssignOrgAdmin(userId: string, rel: FGARelations): boolean {
  return isPlatformAdmin(userId, rel)
}

// ── Conta ─────────────────────────────────────────────────────

/**
 * Pode visualizar a conta e seus dados.
 * FGA: user:<id> can_view account:<accountId>
 *   define can_view: platform_admin or org_admin from org or account_admin or member
 */
export function canViewAccount(
  userId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  if (isAccountAdmin(userId, accountId, rel)) return true
  if (isAccountMember(userId, accountId, rel)) return true
  return false
}

/**
 * Pode convidar usuário para uma conta específica.
 * FGA: user:<id> can_invite account:<accountId>
 *   define can_invite: platform_admin or org_admin from org or account_admin
 */
export function canInviteToAccount(
  userId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  if (isAccountAdmin(userId, accountId, rel)) return true
  return false
}

/**
 * Pode promover um usuário a Account Admin da conta.
 * FGA: user:<id> can_assign_account_admin account:<accountId>
 *   define can_assign_account_admin: platform_admin or org_admin from org
 *
 * Account Admin NÃO pode promover outro Account Admin — só Org Admin ou Platform Admin.
 */
export function canPromoteAccountAdmin(
  userId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  return false
}

// ── Usuários ──────────────────────────────────────────────────

/**
 * Pode gerenciar usuários (ver lista, convidar, remover da conta).
 * FGA: user:<id> can_manage_users account:<accountId>
 *   define can_manage_users: platform_admin or org_admin from org or account_admin
 */
export function canManageUsers(
  userId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  if (isAccountAdmin(userId, accountId, rel)) return true
  return false
}

// ── Grupos ────────────────────────────────────────────────────

/**
 * Pode gerenciar grupos (criar, editar, excluir, adicionar membros).
 * FGA: user:<id> can_manage_groups account:<accountId>
 *   define can_manage_groups: platform_admin or org_admin from org or account_admin
 */
export function canManageGroups(
  userId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  if (isAccountAdmin(userId, accountId, rel)) return true
  return false
}

// ── Componentes ───────────────────────────────────────────────

/**
 * Pode gerenciar componentes da plataforma (criar, editar, configurar metadata).
 * FGA: user:<id> can_manage_components
 *   define can_manage_components: platform_admin or pas_architect
 *
 * Account Admin e Org Admin NÃO gerenciam componentes — eles atribuem papéis.
 */
export function canManageComponents(userId: string, rel: FGARelations): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  // pas_architect tem acesso global a componentes (não restrito por org no PoC)
  if (rel.pasArchitects.some(r => r.userId === userId)) return true
  return false
}

// ── Papéis por componente ─────────────────────────────────────

/**
 * Pode atribuir papéis por componente a usuários ou grupos dentro de uma conta.
 * FGA: user:<id> can_assign_roles account:<accountId>
 *   define can_assign_roles: platform_admin or org_admin from org or account_admin
 */
export function canAssignRoles(
  userId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  if (isAccountAdmin(userId, accountId, rel)) return true
  return false
}

// ── Helpers de perfil (sidebar / navegação) ───────────────────

/** Usuário tem papel platform_admin. */
export function getIsPlatformAdmin(userId: string, rel: FGARelations): boolean {
  return isPlatformAdmin(userId, rel)
}

/** Usuário tem papel org_admin em pelo menos uma org. */
export function getIsOrgAdmin(userId: string, rel: FGARelations): boolean {
  return rel.orgAdmins.some(r => r.userId === userId)
}

/** Usuário tem papel pas_architect em pelo menos uma org. */
export function getIsPasArchitect(userId: string, rel: FGARelations): boolean {
  return rel.pasArchitects.some(r => r.userId === userId)
}

/** Usuário tem papel account_admin em pelo menos uma conta. */
export function getIsAccountAdmin(userId: string, rel: FGARelations): boolean {
  return rel.accountAdmins.some(r => r.userId === userId)
}

/**
 * Retorna o accountId da conta que o usuário administra.
 * Retorna null se o usuário não for account_admin de nenhuma conta,
 * ou se for platform_admin / org_admin (sem conta específica como contexto).
 */
export function getAdminAccountId(userId: string, rel: FGARelations): string | null {
  const entry = rel.accountAdmins.find(r => r.userId === userId)
  return entry?.accountId ?? null
}

/**
 * Retorna o orgId da org que o usuário administra.
 * Retorna null se o usuário não for org_admin de nenhuma org.
 */
export function getAdminOrgId(userId: string, rel: FGARelations): string | null {
  const entry = rel.orgAdmins.find(r => r.userId === userId)
  return entry?.orgId ?? null
}

// ── Instâncias ────────────────────────────────────────────────

/**
 * Retorna o papel do usuário em uma instância específica.
 * Considera membros diretos (user) e membros via grupos (group#member).
 *
 * FGA:
 *   define viewer: [user, group#member] or member
 *   define member: [user, group#member] or admin
 *   define admin:  [user, group#member]
 *
 * Platform Admin tem papel 'admin' implícito em todas as instâncias.
 */
export function getInstanciaRole(
  userId: string,
  instanceId: string,
  rel: FGARelations,
): 'admin' | 'member' | 'viewer' | null {
  if (isPlatformAdmin(userId, rel)) return 'admin'

  const members = rel.instanceMembers ?? []

  // Membro direto como usuário
  const direct = members.find(
    m => m.entityType === 'user' && m.entityId === userId && m.instanceId === instanceId
  )
  if (direct) return direct.role

  // Membro via grupo
  const userGroupIds = rel.groupMembers
    .filter(g => g.userId === userId)
    .map(g => g.groupId)

  const viaGroup = members.find(
    m => m.entityType === 'group' && userGroupIds.includes(m.entityId) && m.instanceId === instanceId
  )
  if (viaGroup) return viaGroup.role

  return null
}

/**
 * Pode gerenciar membros de uma instância (adicionar, editar papel, remover).
 *
 * FGA:
 *   define can_manage_members: admin from instance
 *                              or account_admin
 *                              or org_admin from org
 *                              or platform_admin
 */
export function canManageInstanciaMembros(
  userId: string,
  instanceId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (isOrgAdmin(userId, orgId, rel)) return true
  if (isAccountAdmin(userId, accountId, rel)) return true
  return getInstanciaRole(userId, instanceId, rel) === 'admin'
}
