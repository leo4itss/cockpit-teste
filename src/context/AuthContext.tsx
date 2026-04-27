// ── Contexto de autenticação e autorização (PoC) ───────────────────────────
// Provê o "usuário logado" e as relações FGA para toda a árvore React.
//
// PoC: usuário simulado localmente com switcher de persona para testes.
// Em produção: substituir por fetch da sessão real + carregamento das relações via API.

import { createContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '@/api/client'
import { users as mockUsers } from '@/data/mock'
import { mockFGARelations, mockPersonas } from '@/authz/mock'
import type { FGARelations, Persona } from '@/authz/types'
import type { User } from '@/types'

// ── Tipos do contexto ────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Usuário atualmente "logado" */
  currentUser: User
  /** Lista de personas disponíveis para troca (apenas em modo PoC) */
  personas: Persona[]
  /** Troca a persona ativa */
  setPersonaId: (userId: string) => void
  /** Persona ativa */
  activePersona: Persona
  /** Estado de relações FGA — conjunto de tuplas do modelo */
  relations: FGARelations
}

export const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────────

const DEFAULT_PERSONA_ID = '1' // Platform Admin por padrão
const PERSONA_STORAGE_KEY = 'fga-poc-persona'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [personaId, setPersonaIdState] = useState<string>(() => {
    return localStorage.getItem(PERSONA_STORAGE_KEY) ?? DEFAULT_PERSONA_ID
  })
  const [users, setUsers] = useState<User[]>(mockUsers)

  // Carrega a lista de usuários reais para enriquecer as personas
  useEffect(() => {
    api.getUsers()
      .then(data => { if (data?.length) setUsers(data) })
      .catch(() => { /* usa mock */ })
  }, [])

  function setPersonaId(userId: string) {
    setPersonaIdState(userId)
    localStorage.setItem(PERSONA_STORAGE_KEY, userId)
  }

  const currentUser = users.find(u => u.id === personaId) ?? users[0]
  const activePersona =
    mockPersonas.find(p => p.userId === personaId) ?? mockPersonas[0]

  const value: AuthContextValue = {
    currentUser,
    personas: mockPersonas,
    setPersonaId,
    activePersona,
    relations: mockFGARelations,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
