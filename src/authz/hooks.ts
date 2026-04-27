// ── Hooks de autorização ────────────────────────────────────────────────────
// Wrappers React em volta do engine, bindados ao usuário atual do AuthContext.
// Use estes hooks nos componentes — nunca chame o engine diretamente na UI.

import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'
import * as engine from './engine'

// ── Hook base ────────────────────────────────────────────────────────────────

/** Retorna o contexto de autenticação/autorização completo. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}

/** Retorna apenas o usuário atual. */
export function useCurrentUser() {
  return useAuth().currentUser
}

// ── Organization ─────────────────────────────────────────────────────────────

export function useCanViewOrganization(orgId: string): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canViewOrganization(currentUser.id, orgId, relations)
}

export function useCanManageAccounts(orgId: string): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canManageAccounts(currentUser.id, orgId, relations)
}

export function useCanManageContracts(orgId: string): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canManageContracts(currentUser.id, orgId, relations)
}

export function useCanManageSolutions(orgId: string): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canManageSolutions(currentUser.id, orgId, relations)
}

export function useCanCreateOrganization(): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canCreateOrganization(currentUser.id, relations)
}

// ── Account ──────────────────────────────────────────────────────────────────

export function useCanViewAccount(accountId: string, orgId: string): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canViewAccount(currentUser.id, accountId, orgId, relations)
}

/**
 * PoC: usa a conta padrão 'a1' (Apple) como contexto.
 * Em produção, o accountId viria do contexto da conta ativa do usuário.
 */
export function useCanManageUsers(
  accountId = 'a1',
  orgId = '1',
): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canManageUsers(currentUser.id, accountId, orgId, relations)
}

export function useCanManageGroups(
  accountId = 'a1',
  orgId = '1',
): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canManageGroups(currentUser.id, accountId, orgId, relations)
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * PoC: conta 'a1' como contexto padrão dos componentes.
 */
export function useCanViewComponent(componentId: string, accountId = 'a1'): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canViewComponent(currentUser.id, componentId, accountId, relations)
}

export function useCanEditComponent(componentId: string, accountId = 'a1'): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canEditComponent(currentUser.id, componentId, accountId, relations)
}

export function useCanManageComponent(componentId: string, accountId = 'a1'): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canManageComponent(currentUser.id, componentId, accountId, relations)
}

export function useCanDeleteComponent(accountId = 'a1'): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canDeleteComponent(currentUser.id, accountId, relations)
}

// ── Contract ─────────────────────────────────────────────────────────────────

export function useCanViewContract(contractId: string, orgId: string): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canViewContract(currentUser.id, contractId, orgId, relations)
}

export function useCanManageContract(contractId: string, orgId: string): boolean {
  const { currentUser, relations } = useAuth()
  return engine.canManageContract(currentUser.id, contractId, orgId, relations)
}
