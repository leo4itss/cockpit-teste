// ── Engine de autorização FGA (local) ──────────────────────────────────────
// Funções puras que avaliam permissões com base no estado de relações FGA.
// Cada função documenta a regra FGA que está implementando.
//
// Em produção: substituir por chamadas ao SDK do OpenFGA.
// Ex: await fgaClient.check({ user: `user:${userId}`, relation: 'can_view', object: `organization:${orgId}` })

import type { FGARelations, ComponentRole } from './types'

// ── Helpers internos ─────────────────────────────────────────────────────────

/** Retorna os IDs de todos os grupos dos quais o usuário é membro direto. */
function getGroupIds(userId: string, rel: FGARelations): string[] {
  return rel.groupMembers
    .filter(gm => gm.userId === userId)
    .map(gm => gm.groupId)
}

/** Verifica se o usuário é platform_admin (acesso global). */
function isPlatformAdmin(userId: string, rel: FGARelations): boolean {
  return rel.platformAdmins.includes(userId)
}

// ── Organization ─────────────────────────────────────────────────────────────

/**
 * Implementa: define can_view: member or org_admin or platform_admin
 *
 * Inclui group#member → org.member (via groupOrgRoles).
 */
export function canViewOrganization(
  userId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true

  // papéis diretos
  if (rel.orgAdmins.some(r => r.userId === userId && r.orgId === orgId)) return true
  if (rel.pasArchitects.some(r => r.userId === userId && r.orgId === orgId)) return true
  if (rel.orgMembers.some(r => r.userId === userId && r.orgId === orgId)) return true

  // group#member → org
  const groupIds = getGroupIds(userId, rel)
  return rel.groupOrgRoles.some(r => groupIds.includes(r.groupId) && r.orgId === orgId)
}

/**
 * Implementa: define can_manage_accounts: org_admin or platform_admin
 */
export function canManageAccounts(
  userId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  return rel.orgAdmins.some(r => r.userId === userId && r.orgId === orgId)
}

/**
 * Implementa: define can_manage_contracts: org_admin or platform_admin
 */
export function canManageContracts(
  userId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  return rel.orgAdmins.some(r => r.userId === userId && r.orgId === orgId)
}

/**
 * Implementa: define can_manage_solutions: pas_architect or platform_admin
 */
export function canManageSolutions(
  userId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  return rel.pasArchitects.some(r => r.userId === userId && r.orgId === orgId)
}

/**
 * Cria organizações: apenas platform_admin.
 * (Não há "create_org" no modelo — interpretado como gestão global de plataforma.)
 */
export function canCreateOrganization(userId: string, rel: FGARelations): boolean {
  return isPlatformAdmin(userId, rel)
}

// ── Account ──────────────────────────────────────────────────────────────────

/**
 * Implementa: define can_view: member or account_admin or org_admin from organization
 *
 * "org_admin from organization" = o usuário é org_admin da org à qual a conta pertence.
 */
export function canViewAccount(
  userId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true

  // papéis diretos na conta
  if (rel.accountAdmins.some(r => r.userId === userId && r.accountId === accountId)) return true
  if (rel.accountMembers.some(r => r.userId === userId && r.accountId === accountId)) return true

  // org_admin from organization
  if (rel.orgAdmins.some(r => r.userId === userId && r.orgId === orgId)) return true

  // group#member → account
  const groupIds = getGroupIds(userId, rel)
  return rel.groupAccountRoles.some(r => groupIds.includes(r.groupId) && r.accountId === accountId)
}

/**
 * Implementa: define can_manage_users: account_admin or org_admin from organization
 */
export function canManageUsers(
  userId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (rel.accountAdmins.some(r => r.userId === userId && r.accountId === accountId)) return true
  // org_admin from organization
  return rel.orgAdmins.some(r => r.userId === userId && r.orgId === orgId)
}

/**
 * Implementa: define can_manage_groups: account_admin or org_admin from organization
 * (mesma regra que can_manage_users)
 */
export function canManageGroups(
  userId: string,
  accountId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  return canManageUsers(userId, accountId, orgId, rel)
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Verifica se o usuário (diretamente ou via grupo) tem um dos papéis informados
 * sobre o componente.
 */
function hasComponentRole(
  userId: string,
  componentId: string,
  roles: ComponentRole[],
  rel: FGARelations,
): boolean {
  // papel direto
  if (rel.componentRoles.some(r =>
    r.userId === userId && r.componentId === componentId && roles.includes(r.role)
  )) return true

  // group#member → component
  const groupIds = getGroupIds(userId, rel)
  return rel.groupComponentRoles.some(r =>
    groupIds.includes(r.groupId) && r.componentId === componentId && roles.includes(r.role)
  )
}

/**
 * Implementa: define can_view: viewer or editor or manager or account_admin from account
 */
export function canViewComponent(
  userId: string,
  componentId: string,
  accountId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (rel.accountAdmins.some(r => r.userId === userId && r.accountId === accountId)) return true
  return hasComponentRole(userId, componentId, ['viewer', 'editor', 'manager'], rel)
}

/**
 * Implementa: define can_edit: editor or manager or account_admin from account
 */
export function canEditComponent(
  userId: string,
  componentId: string,
  accountId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (rel.accountAdmins.some(r => r.userId === userId && r.accountId === accountId)) return true
  return hasComponentRole(userId, componentId, ['editor', 'manager'], rel)
}

/**
 * Implementa: define can_manage: manager or account_admin from account
 */
export function canManageComponent(
  userId: string,
  componentId: string,
  accountId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  if (rel.accountAdmins.some(r => r.userId === userId && r.accountId === accountId)) return true
  return hasComponentRole(userId, componentId, ['manager'], rel)
}

/**
 * Implementa: define can_delete: account_admin from account
 */
export function canDeleteComponent(
  userId: string,
  accountId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  return rel.accountAdmins.some(r => r.userId === userId && r.accountId === accountId)
}

// ── Contract ─────────────────────────────────────────────────────────────────

/**
 * Implementa: define can_view: viewer or manager or org_admin from organization or platform_admin from organization
 */
export function canViewContract(
  userId: string,
  contractId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  // org_admin from organization
  if (rel.orgAdmins.some(r => r.userId === userId && r.orgId === orgId)) return true
  return rel.contractRoles.some(r => r.userId === userId && r.contractId === contractId)
}

/**
 * Implementa: define can_manage: manager or org_admin from organization or platform_admin from organization
 */
export function canManageContract(
  userId: string,
  contractId: string,
  orgId: string,
  rel: FGARelations,
): boolean {
  if (isPlatformAdmin(userId, rel)) return true
  // org_admin from organization
  if (rel.orgAdmins.some(r => r.userId === userId && r.orgId === orgId)) return true
  return rel.contractRoles.some(r =>
    r.userId === userId && r.contractId === contractId && r.role === 'manager'
  )
}
