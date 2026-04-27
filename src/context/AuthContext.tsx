// ── Contexto de autenticação e autorização (PoC) ───────────────────────────
// Provê o "usuário logado" e as relações FGA para toda a árvore React.
//
// PoC: usuário simulado localmente com switcher de persona para testes.
// Em produção: substituir por fetch da sessão real + carregamento das relações via API.

import { createContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '@/api/client'
import { users as mockUsers } from '@/data/mock'
import { mockFGARelations, mockPersonas } from '@/authz/mock'
import type { FGARelations, Persona, ComponentRole } from '@/authz/types'
import type { User, Grupo, GrupoPermissao } from '@/types'

// ── Tipos do contexto ────────────────────────────────────────────────────────

interface AuthContextValue {
  currentUser: User
  personas: Persona[]
  setPersonaId: (userId: string) => void
  activePersona: Persona
  /** Relações FGA: base estática (mock) + roles de grupo carregados do banco */
  relations: FGARelations
  /** Recarrega as relações de grupo do banco (chamar após salvar permissões) */
  reloadGroupRelations: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────────

const DEFAULT_PERSONA_ID = '1'
const PERSONA_STORAGE_KEY = 'fga-poc-persona'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [personaId, setPersonaIdState] = useState<string>(() => {
    return localStorage.getItem(PERSONA_STORAGE_KEY) ?? DEFAULT_PERSONA_ID
  })
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [relations, setRelations] = useState<FGARelations>(mockFGARelations)

  useEffect(() => {
    api.getUsers()
      .then(data => { if (data?.length) setUsers(data) })
      .catch(() => {})
  }, [])

  // Carrega relações de grupo do banco e mescla com o mock estático.
  //
  // Para cada grupo no banco:
  //   1. Pega os membros → preenche groupMembers
  //   2. Pega as permissões → preenche groupComponentRoles
  //      GrupoPermissao.permissoesAtivas[0] é o role FGA ('viewer'|'editor'|'manager')
  //      que mapeia para: group:<grupoId>#member @<role> component:<objetoId>
  async function loadGroupRelations() {
    try {
      const grupos: Grupo[] = await api.getGrupos()

      const groupMembers: FGARelations['groupMembers'] = []
      const groupComponentRoles: FGARelations['groupComponentRoles'] = []

      await Promise.all(grupos.map(async (grupo) => {
        // Membros do grupo → groupMembers
        const membros: User[] = await api.getMembrosGrupo(grupo.id).catch(() => [])
        for (const m of membros) {
          groupMembers.push({ userId: m.id, groupId: grupo.id })
        }

        // Permissões do grupo → groupComponentRoles
        // Cada GrupoPermissao representa:
        //   group:<grupoId>#member @<role> component:<componenteObjetoId>
        const perms: GrupoPermissao[] = await api.getPermissoesGrupo(grupo.id).catch(() => [])
        for (const perm of perms) {
          const roleId = (perm.permissoesAtivas as string[])[0]
          if (roleId && ['viewer', 'editor', 'manager'].includes(roleId)) {
            groupComponentRoles.push({
              groupId: grupo.id,
              componentId: perm.componenteObjetoId, // usa objetoId como resourceId
              role: roleId as ComponentRole,
            })
          }
        }
      }))

      // Mescla: mantém relações estáticas do mock + sobrescreve com dados reais do banco
      setRelations({
        ...mockFGARelations,
        groupMembers: [
          // Mantém groupMembers do mock (grupos que só existem no mock)
          ...mockFGARelations.groupMembers.filter(gm =>
            !groupMembers.some(r => r.userId === gm.userId && r.groupId === gm.groupId)
          ),
          ...groupMembers,
        ],
        groupComponentRoles: [
          ...mockFGARelations.groupComponentRoles,
          ...groupComponentRoles,
        ],
      })
    } catch {
      // Backend indisponível — mantém mock estático
    }
  }

  useEffect(() => { loadGroupRelations() }, [])

  function setPersonaId(userId: string) {
    setPersonaIdState(userId)
    localStorage.setItem(PERSONA_STORAGE_KEY, userId)
  }

  const currentUser = users.find(u => u.id === personaId) ?? users[0]
  const activePersona = mockPersonas.find(p => p.userId === personaId) ?? mockPersonas[0]

  const value: AuthContextValue = {
    currentUser,
    personas: mockPersonas,
    setPersonaId,
    activePersona,
    relations,
    reloadGroupRelations: loadGroupRelations,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
