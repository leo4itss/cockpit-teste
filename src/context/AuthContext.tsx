/**
 * AuthContext — contexto de autenticação e autorização FGA.
 *
 * No PoC:
 *   - A "sessão" é controlada pelo switcher de personas (localStorage).
 *   - As relações FGA são carregadas do mock (mockFGARelations).
 *   - Em produção: currentUser viria do IdP (ex: Auth0/Cognito) e as
 *     relações seriam lidas do OpenFGA SDK via reloadRelations().
 *
 * Exporta:
 *   AuthContext      — contexto React (usado pelos hooks de authz)
 *   AuthProvider     — provider + PersonaSwitcher flutuante
 *   useAuth          — hook de acesso direto (escape hatch)
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, FGARelations, Persona } from '@/types'
import { users as mockUsers } from '@/data/mock'
import { mockFGARelations, mockPersonas } from '@/authz/mock'

// ── Tipos ─────────────────────────────────────────────────────

export interface AuthContextValue {
  /** Usuário atualmente logado (derivado da persona ativa no PoC). */
  currentUser: User
  /** Estado completo das relações FGA do usuário atual. */
  relations: FGARelations
  /** Lista de personas disponíveis para o switcher (PoC only). */
  personas: Persona[]
  /** Troca a persona ativa e persiste em localStorage (PoC only). */
  switchPersona: (userId: string) => void
  /**
   * Recarrega as relações FGA do backend.
   * No PoC resolve imediatamente (mock estático).
   * Em produção: chamaria o OpenFGA SDK.
   */
  reloadRelations: () => Promise<void>
}

// ── Contexto ──────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null)

// ── Hook de acesso direto ─────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}

// ── Helpers internos ──────────────────────────────────────────

const STORAGE_KEY = 'cockpit_persona_id'
const DEFAULT_PERSONA_ID = '1' // Platform Admin

function resolveUser(personaId: string): User {
  return mockUsers.find(u => u.id === personaId) ?? mockUsers[0]
}

function loadPersonaId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_PERSONA_ID
  } catch {
    return DEFAULT_PERSONA_ID
  }
}

// ── AuthProvider ──────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [personaId, setPersonaId] = useState<string>(loadPersonaId)
  const [relations] = useState<FGARelations>(mockFGARelations)

  const currentUser = resolveUser(personaId)

  const switchPersona = useCallback((userId: string) => {
    try { localStorage.setItem(STORAGE_KEY, userId) } catch { /* ignore */ }
    setPersonaId(userId)
  }, [])

  // No PoC: relações são estáticas — reloadRelations é no-op.
  // Em produção: faria fetch ao OpenFGA e chamaria setRelations().
  const reloadRelations = useCallback(async () => {
    // noop
  }, [])

  const value: AuthContextValue = {
    currentUser,
    relations,
    personas: mockPersonas,
    switchPersona,
    reloadRelations,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PersonaSwitcher
        personas={mockPersonas}
        activeId={personaId}
        onSwitch={switchPersona}
      />
    </AuthContext.Provider>
  )
}

// ── PersonaSwitcher ───────────────────────────────────────────
// Flutuante no canto inferior direito — visível apenas no PoC.
// Mostra qual persona está ativa e permite trocar.

interface PersonaSwitcherProps {
  personas: Persona[]
  activeId: string
  onSwitch: (userId: string) => void
}

function PersonaSwitcher({ personas, activeId, onSwitch }: PersonaSwitcherProps) {
  const [open, setOpen] = useState(false)
  const active = personas.find(p => p.userId === activeId) ?? personas[0]

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Painel expandido */}
      {open && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-64 flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
            Trocar persona (PoC)
          </p>
          {personas.map(p => (
            <button
              key={p.userId}
              onClick={() => { onSwitch(p.userId); setOpen(false) }}
              className={`flex items-center gap-3 w-full px-2 py-2 rounded-lg text-left transition-colors ${
                p.userId === activeId
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Avatar name={p.label} gradient={p.color} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{p.label}</p>
                <p className="text-[10px] text-gray-500 truncate">{p.description.split('—')[0].trim()}</p>
              </div>
              {p.userId === activeId && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-full shadow-md px-3 py-1.5 hover:shadow-lg transition-shadow"
        title="Trocar persona (PoC)"
      >
        <Avatar name={active.label} gradient={active.color} size="xs" />
        <span className="text-xs font-semibold text-gray-700">{active.label}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
    </div>
  )
}

// ── Avatar helper ─────────────────────────────────────────────

function Avatar({
  name,
  gradient,
  size,
}: {
  name: string
  gradient: string
  size: 'xs' | 'sm'
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const sizeClass = size === 'xs' ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]'

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white shrink-0`}
    >
      {initials}
    </div>
  )
}
