/**
 * GrupoDetailSheet — Detalhe de um grupo da conta.
 *
 * Funcionalidades:
 *   - Lista de membros com avatar, nome e e-mail
 *   - Adicionar membro via busca inline (dropdown de sugestões)
 *   - Remover membro com confirmação (ação visível só no hover)
 *   - Atribuir permissões ao grupo → abre AtribuirPermissoesSheet aninhada (nível 2)
 *
 * O AtribuirPermissoesSheet é renderizado dentro do contexto do GrupoDetailSheet,
 * recebendo automaticamente nível 2 (painel z=60, overlay z=59).
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, UserPlus, UserMinus, Shield, Loader2 } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AtribuirPermissoesSheet } from '@/components/permissoes/AtribuirPermissoesSheet'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import type { User, Grupo } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────

interface Props {
  open:         boolean
  onClose:      () => void
  grupo:        Grupo | null
  accountId:    string
  accountNome?: string
}

// ── Helpers ───────────────────────────────────────────────────

function Avatar({ nome }: { nome: string }) {
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-[#e5e7eb] shrink-0 flex items-center justify-center text-xs font-semibold text-[#6b7280] select-none">
      {ini}
    </div>
  )
}

function EscopoBadge({ escopo }: { escopo: 'org' | 'conta' }) {
  return escopo === 'org'
    ? <Badge variant="info">Organização</Badge>
    : <Badge variant="default" className="bg-violet-50 text-violet-700 border border-violet-200">Conta</Badge>
}

// ── Seção de busca para adicionar membro ──────────────────────

interface AddMembroProps {
  allUsers:  User[]
  membros:   User[]
  onAdd:     (user: User) => void
  disabled?: boolean
}

function AddMembroSection({ allUsers, membros, onAdd, disabled }: AddMembroProps) {
  const [search, setSearch] = useState('')

  const sugestoes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    const ids = new Set(membros.map(m => m.id))
    return allUsers
      .filter(u => !ids.has(u.id))
      .filter(u =>
        u.nomeCompleto.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
      .slice(0, 5)
  }, [search, allUsers, membros])

  function select(user: User) {
    onAdd(user)
    setSearch('')
  }

  return (
    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60">
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar usuário para adicionar..."
            disabled={disabled}
            className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 leading-none text-base">×</button>
          )}
        </div>

        {/* Dropdown de sugestões */}
        {sugestoes.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
            {sugestoes.map(user => (
              <button
                key={user.id}
                onClick={() => select(user)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <Avatar nome={user.nomeCompleto} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</p>
                  <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Sem resultados */}
        {search.trim().length > 0 && sugestoes.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 px-4 py-3">
            <p className="text-sm text-[#6b7280]">Nenhum usuário encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export function GrupoDetailSheet({ open, onClose, grupo, accountId, accountNome }: Props) {
  const [membros, setMembros]           = useState<User[]>([])
  const [loadingMembros, setLoadingMembros] = useState(false)
  const [allUsers, setAllUsers]         = useState<User[]>([])
  const [showAdd, setShowAdd]           = useState(false)
  const [addingId, setAddingId]         = useState<string | null>(null)
  const [removingId, setRemovingId]     = useState<string | null>(null)
  const [showAtribuir, setShowAtribuir] = useState(false)

  // Carrega membros e todos os usuários ao abrir
  useEffect(() => {
    if (!open || !grupo) return
    setLoadingMembros(true)
    setShowAdd(false)

    Promise.all([
      api.getGrupoMembros(grupo.id),
      api.getUsers(),
    ]).then(([mems, users]) => {
      setMembros(mems)
      setAllUsers(users)
      setLoadingMembros(false)
    }).catch(() => setLoadingMembros(false))
  }, [open, grupo])

  // ── Adicionar membro ─────────────────────────────────────

  async function handleAdd(user: User) {
    if (!grupo) return
    setAddingId(user.id)
    try {
      await api.addGrupoMembro(grupo.id, user.id)
      setMembros(prev => prev.find(m => m.id === user.id) ? prev : [...prev, user])
    } finally {
      setAddingId(null)
    }
  }

  // ── Remover membro ───────────────────────────────────────

  async function handleRemove(user: User) {
    if (!grupo) return
    if (!confirm(`Remover ${user.nomeCompleto} do grupo?`)) return
    setRemovingId(user.id)
    try {
      await api.removeGrupoMembro(grupo.id, user.id)
      setMembros(prev => prev.filter(m => m.id !== user.id))
    } finally {
      setRemovingId(null)
    }
  }

  // ── Atribuir permissões ──────────────────────────────────

  function handleAtribuirSuccess() {
    console.info('[FGA] Permissões atualizadas para o grupo:', grupo?.nome)
  }

  function handleClose() {
    setMembros([]); setAllUsers([]); setShowAdd(false)
    setShowAtribuir(false)
    onClose()
  }

  if (!grupo) return null

  // ── Render ────────────────────────────────────────────────

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[600px]">
      <NestedSheetHeader onClose={handleClose}>
        <div className="flex items-center gap-2 mb-1">
          <EscopoBadge escopo={grupo.escopo} />
        </div>
        <NestedSheetTitle>{grupo.nome}</NestedSheetTitle>
        {grupo.descricao && (
          <NestedSheetDescription>{grupo.descricao}</NestedSheetDescription>
        )}
      </NestedSheetHeader>

      <NestedSheetBody noPadding>
        {/* Barra de membros com contagem e ação */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-[#030712]">
            Membros
            {!loadingMembros && (
              <span className="ml-1.5 text-xs font-normal text-[#6b7280]">({membros.length})</span>
            )}
          </p>
          <button
            onClick={() => setShowAdd(v => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              showAdd
                ? 'bg-gray-100 text-[#030712]'
                : 'border border-gray-200 bg-white text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]'
            )}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showAdd ? 'Fechar busca' : 'Adicionar membro'}
          </button>
        </div>

        {/* Lista de membros */}
        <div className="flex-1 overflow-y-auto">
          {loadingMembros ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Carregando membros...
            </div>
          ) : membros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm font-medium text-[#030712]">Nenhum membro ainda</p>
              <p className="text-xs text-[#6b7280]">
                Use o botão acima para adicionar usuários ao grupo.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {membros.map(user => {
                  const isRemoving = removingId === user.id
                  const isAdding   = addingId === user.id
                  return (
                    <tr
                      key={user.id}
                      className="group border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-b-0"
                    >
                      <td className="pl-6 pr-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nome={user.nomeCompleto} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</p>
                            <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#6b7280] hidden sm:table-cell">
                        {user.cargo || user.papel || '—'}
                      </td>
                      {/* Ação remover — visível só no hover */}
                      <td className="pr-6 pl-3 py-3 text-right">
                        <div className="invisible group-hover:visible">
                          <button
                            onClick={() => handleRemove(user)}
                            disabled={isRemoving || isAdding}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Remover do grupo"
                          >
                            {isRemoving
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <UserMinus className="w-3.5 h-3.5" />}
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Busca inline para adicionar membro */}
        {showAdd && (
          <AddMembroSection
            allUsers={allUsers}
            membros={membros}
            onAdd={handleAdd}
            disabled={!!addingId}
          />
        )}

        {/* AtribuirPermissoesSheet aninhada — nível 2 automaticamente */}
        <AtribuirPermissoesSheet
          open={showAtribuir}
          onClose={() => setShowAtribuir(false)}
          entityType="grupo"
          entityId={grupo.id}
          entityNome={grupo.nome}
          accountId={accountId}
          accountNome={accountNome}
          onSuccess={handleAtribuirSuccess}
        />
      </NestedSheetBody>

      <NestedSheetFooter className="justify-between">
        <Button
          variant="outline"
          onClick={() => setShowAtribuir(true)}
        >
          <Shield className="w-4 h-4 mr-1.5" />
          Atribuir permissões ao grupo
        </Button>
        <Button variant="ghost" onClick={handleClose}>
          Fechar
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
