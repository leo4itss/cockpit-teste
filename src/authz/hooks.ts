/**
 * Hooks de autorização — wrappers React em volta do engine FGA.
 *
 * Consomem o AuthContext e delegam ao engine.
 * Use estes hooks nos componentes — nunca chame o engine diretamente na UI.
 *
 * Convenção de nomenclatura:
 *   useCanXxx()  → retorna boolean
 *   useGetXxx()  → retorna valor derivado (string | null, etc.)
 *   useAuthz()   → retorna o contexto completo (escape hatch)
 */

import { useContext, useState, useEffect } from 'react'
import { AuthContext } from '@/context/AuthContext'
import * as engine from './engine'
import { getInstanciaAtribuicoes, canActWithAtribuicao } from './engine'
import { getComponenteConfig, type ComponenteTypeConfig } from './mock'

// ── Hook base ─────────────────────────────────────────────────

function useAuthz() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthz deve ser usado dentro de <AuthProvider>')
  return ctx
}

// Re-exportado para uso direto em componentes que precisam de currentUser/relations
export { useAuthz }

// ── Organização ───────────────────────────────────────────────

export function useCanViewOrganization(orgId: string): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canViewOrganization(currentUser.id, orgId, relations)
}

export function useCanCreateOrganization(): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canCreateOrganization(currentUser.id, relations)
}

export function useCanManageAccounts(orgId: string): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canManageAccounts(currentUser.id, orgId, relations)
}

export function useCanInviteToOrg(orgId: string): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canInviteToOrg(currentUser.id, orgId, relations)
}

export function useCanAssignOrgAdmin(): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canAssignOrgAdmin(currentUser.id, relations)
}

// ── Conta ─────────────────────────────────────────────────────

/**
 * PoC: orgId padrão '1' (Apple). Em produção, viria do contexto da org ativa.
 */
export function useCanViewAccount(accountId: string, orgId = '1'): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canViewAccount(currentUser.id, accountId, orgId, relations)
}

export function useCanInviteToAccount(accountId: string, orgId = '1'): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canInviteToAccount(currentUser.id, accountId, orgId, relations)
}

export function useCanPromoteAccountAdmin(orgId = '1'): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canPromoteAccountAdmin(currentUser.id, orgId, relations)
}

// ── Usuários ──────────────────────────────────────────────────

/**
 * PoC: accountId e orgId com defaults da conta/org principal.
 * Account Admin de a2 passará accountId='a2' explicitamente.
 */
export function useCanManageUsers(accountId = 'a1', orgId = '1'): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canManageUsers(currentUser.id, accountId, orgId, relations)
}

// ── Grupos ────────────────────────────────────────────────────

export function useCanManageGroups(accountId = 'a1', orgId = '1'): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canManageGroups(currentUser.id, accountId, orgId, relations)
}

// ── Componentes ───────────────────────────────────────────────

export function useCanManageComponents(): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canManageComponents(currentUser.id, relations)
}

// ── Papéis ────────────────────────────────────────────────────

export function useCanAssignRoles(accountId = 'a1', orgId = '1'): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.canAssignRoles(currentUser.id, accountId, orgId, relations)
}

// ── Perfil / navegação ────────────────────────────────────────

export function useIsPlatformAdmin(): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.getIsPlatformAdmin(currentUser.id, relations)
}

export function useIsOrgAdmin(): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.getIsOrgAdmin(currentUser.id, relations)
}

export function useIsPasArchitect(): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.getIsPasArchitect(currentUser.id, relations)
}

export function useIsAccountAdmin(): boolean {
  const { currentUser, relations } = useAuthz()
  return engine.getIsAccountAdmin(currentUser.id, relations)
}

/**
 * Retorna o accountId que o usuário atual administra, ou null.
 * Útil para Account Admin saber qual conta é a "sua".
 */
export function useAdminAccountId(): string | null {
  const { currentUser, relations } = useAuthz()
  return engine.getAdminAccountId(currentUser.id, relations)
}

/**
 * Retorna o orgId que o usuário atual administra, ou null.
 * Útil para Org Admin saber qual org é a "sua".
 */
export function useAdminOrgId(): string | null {
  const { currentUser, relations } = useAuthz()
  return engine.getAdminOrgId(currentUser.id, relations)
}

// ── Instâncias ────────────────────────────────────────────────

/**
 * Retorna o papel do usuário em uma instância específica,
 * ou null se não tiver acesso.
 */
export function useGetInstanciaRole(instanceId: string): 'admin' | 'member' | 'viewer' | null {
  const { currentUser, relations } = useAuthz()
  return engine.getInstanciaRole(currentUser.id, instanceId, relations)
}

/**
 * Pode gerenciar membros de uma instância (adicionar, editar papel, remover).
 * PoC: accountId e orgId com defaults do cenário Comgas/Docnix.
 */
export function useCanManageInstanciaMembros(
  instanceId: string,
  accountId = '',
  orgId?: string,
): boolean {
  const { currentUser, relations } = useAuthz()
  // Se orgId não for passado, deriva do papel de Org Admin do usuário logado.
  // Evita o hardcode '1' que excluía orgs como 'org-docnix'.
  const effectiveOrgId = orgId
    ?? relations.orgAdmins.find(a => a.userId === currentUser.id)?.orgId
    ?? ''
  return engine.canManageInstanciaMembros(currentUser.id, instanceId, accountId, effectiveOrgId, relations)
}

// ── DocNix: Atribuições ───────────────────────────────────────

/**
 * Retorna as atribuições efetivas do usuário logado em uma instância.
 * Retorna ['*'] se o usuário tem acesso irrestrito.
 */
export function useGetInstanciaAtribuicoes(
  instanceId: string,
  accountId: string,
  orgId: string,
): string[] {
  const { currentUser, relations } = useAuthz()
  if (!currentUser) return []
  return getInstanciaAtribuicoes(currentUser.id, instanceId, accountId, orgId, relations)
}

/**
 * Verifica se o usuário logado pode executar uma atribuição específica em uma instância.
 */
export function useCanActWithAtribuicao(
  instanceId: string,
  atribuicaoId: string,
  accountId: string,
  orgId: string,
): boolean {
  const { currentUser, relations } = useAuthz()
  if (!currentUser) return false
  return canActWithAtribuicao(currentUser.id, instanceId, atribuicaoId, accountId, orgId, relations)
}
