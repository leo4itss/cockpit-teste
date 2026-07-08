/**
 * GrupoDetailSheet — Detalhe de um grupo da conta.
 *
 * Funcionalidades:
 *   - Lista de membros com avatar, nome e e-mail
 *   - Adicionar membro via busca inline (dropdown de sugestões)
 *   - Remover membro com confirmação (ação visível só no hover)
 *   - Seção "Objetos" listando instâncias onde o grupo tem acesso
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, UserPlus, UserMinus, Loader2, Building2, Building, Boxes, ChevronDown, ChevronRight } from 'lucide-react'
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
import { api } from '@/api/client'
import type { GrupoInstanciaVinculo } from '@/api/client'
import { cn } from '@/lib/utils'
import { getPapelInfo } from '@/authz/mock'
import type { User, Grupo } from '@/types'
import {
  users as mockUsers,
  accountMembrosIds,
  grupoMembrosMap,
  instanciaMembros as mockInstanciaMembros,
  instancias as mockInstancias,
  componentes as mockComponentes,
} from '@/data/mock'

// ── Tipos ─────────────────────────────────────────────────────

interface Props {
  open:           boolean
  onClose:        () => void
  grupo:          Grupo | null
  accountId:      string
  accountNome?:   string   // nome da conta (escopo='conta') ou da org (escopo='org')
  contextoLabel?: string   // 'Conta' | 'Org'
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

function PapelBadge({ papel }: { papel: string }) {
  if (!papel) return <span className="text-xs text-[#6b7280]">—</span>
  const info = getPapelInfo(papel)
  if (info) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${info.cls}`}>
        {info.label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-600">
      {papel}
    </span>
  )
}

// ── Seção de busca para adicionar membro ──────────────────────

interface AddMembroProps {
  allUsers:  User[]
  membros:   User[]
  onAdd:     (user: User) => void
  /** Adiciona vários usuários de uma vez (endpoint bulk) */
  onAddBulk: (users: User[]) => Promise<void>
  disabled?: boolean
}

function AddMembroSection({ allUsers, membros, onAdd, onAddBulk, disabled }: AddMembroProps) {
  const [search, setSearch] = useState('')
  // Seleção acumulada entre buscas — permite montar um lote pesquisando termos diferentes
  const [selecionados, setSelecionados] = useState<Map<string, User>>(new Map())
  const [addingBulk, setAddingBulk] = useState(false)

  const membroIds = useMemo(() => new Set(membros.map(m => m.id)), [membros])

  // Todos os usuários que casam com a busca (usado pelo "Selecionar todos");
  // a lista exibida no dropdown é um recorte para não pesar o DOM.
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return allUsers
      .filter(u => !membroIds.has(u.id))
      .filter(u =>
        u.nomeCompleto.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
  }, [search, allUsers, membroIds])

  const sugestoes = useMemo(() => matches.slice(0, 30), [matches])

  const todosMatchesSelecionados =
    matches.length > 0 && matches.every(u => selecionados.has(u.id))

  function toggle(user: User) {
    setSelecionados(prev => {
      const next = new Map(prev)
      if (next.has(user.id)) next.delete(user.id)
      else next.set(user.id, user)
      return next
    })
  }

  // Seleciona/desseleciona TODOS os resultados da busca atual — inclusive os
  // que não estão visíveis no recorte do dropdown.
  function toggleSelecionarTodosMatches() {
    setSelecionados(prev => {
      const next = new Map(prev)
      if (todosMatchesSelecionados) matches.forEach(u => next.delete(u.id))
      else matches.forEach(u => next.set(u.id, u))
      return next
    })
  }

  // Clique simples com nada selecionado mantém o fluxo antigo (adiciona na hora);
  // com seleção em andamento, o clique vira toggle para compor o lote.
  function handleRowClick(user: User) {
    if (selecionados.size === 0) {
      onAdd(user)
      setSearch('')
    } else {
      toggle(user)
    }
  }

  async function handleAddSelecionados() {
    if (selecionados.size === 0) return
    setAddingBulk(true)
    try {
      await onAddBulk([...selecionados.values()])
      setSelecionados(new Map())
      setSearch('')
    } finally {
      setAddingBulk(false)
    }
  }

  return (
    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 space-y-2">
      {/* Lote em composição — fica acima da busca para não ser encoberto pelo
          dropdown de sugestões (que é posicionado absolute sobre o conteúdo abaixo). */}
      {selecionados.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-[#6b7280]">
            <strong className="text-[#030712]">{selecionados.size}</strong> {selecionados.size === 1 ? 'selecionado' : 'selecionados'}
          </p>
          <button
            onClick={() => setSelecionados(new Map())}
            disabled={addingBulk}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            limpar
          </button>
          <Button onClick={handleAddSelecionados} disabled={addingBulk} className="ml-auto h-7 text-xs px-3">
            {addingBulk
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Adicionando...</>
              : `Adicionar selecionados (${selecionados.size})`}
          </Button>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar usuário para adicionar..."
            disabled={disabled || addingBulk}
            className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 leading-none text-base">×</button>
          )}
        </div>

        {/* Dropdown de sugestões — checkbox para compor lote, clique para ação */}
        {sugestoes.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden max-h-[280px] overflow-y-auto">
            {/* Selecionar todos os resultados da busca (mesmo os fora do recorte exibido) */}
            <div
              onClick={toggleSelecionarTodosMatches}
              className="w-full flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors sticky top-0"
            >
              <input
                type="checkbox"
                checked={todosMatchesSelecionados}
                onChange={toggleSelecionarTodosMatches}
                onClick={e => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 accent-blue-600 shrink-0 cursor-pointer"
              />
              <p className="text-xs font-medium text-[#374151]">
                Selecionar todos os <strong>{matches.length}</strong> {matches.length === 1 ? 'resultado' : 'resultados'} da busca
              </p>
            </div>
            {sugestoes.map(user => (
              <div
                key={user.id}
                onClick={() => handleRowClick(user)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left cursor-pointer',
                  selecionados.has(user.id) && 'bg-blue-50/60 hover:bg-blue-50',
                )}
              >
                <input
                  type="checkbox"
                  checked={selecionados.has(user.id)}
                  onChange={() => toggle(user)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 accent-blue-600 shrink-0 cursor-pointer"
                />
                <Avatar nome={user.nomeCompleto} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</p>
                  <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
                </div>
              </div>
            ))}
            {matches.length > sugestoes.length && (
              <p className="px-3 py-2 text-xs text-[#6b7280] bg-gray-50 border-t border-gray-100">
                +{matches.length - sugestoes.length} {matches.length - sugestoes.length === 1 ? 'resultado não exibido' : 'resultados não exibidos'} — refine a busca ou use "Selecionar todos".
              </p>
            )}
          </div>
        )}

        {/* Sem resultados */}
        {search.trim().length > 0 && sugestoes.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 px-4 py-3">
            <p className="text-sm text-[#6b7280]">Nenhum usuário encontrado.</p>
          </div>
        )}
      </div>

      {/* Lote em composição */}
      {selecionados.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-[#6b7280]">
            <strong className="text-[#030712]">{selecionados.size}</strong> {selecionados.size === 1 ? 'selecionado' : 'selecionados'}
          </p>
          <button
            onClick={() => setSelecionados(new Map())}
            disabled={addingBulk}
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            limpar
          </button>
          <Button onClick={handleAddSelecionados} disabled={addingBulk} className="ml-auto h-7 text-xs px-3">
            {addingBulk
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Adicionando...</>
              : `Adicionar selecionados (${selecionados.size})`}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export function GrupoDetailSheet({ open, onClose, grupo, accountId, accountNome, contextoLabel }: Props) {
  const [membros, setMembros]           = useState<User[]>([])
  const [loadingMembros, setLoadingMembros] = useState(false)
  // userId → papel de conta ('member' | 'account_admin'), vindo de user_account_memberships.
  // Não usar user.papel diretamente: esse campo é um texto livre (cargo/perfil) da tabela
  // users, sem relação com o papel de conta.
  const [accountPapelMap, setAccountPapelMap] = useState<Record<string, string>>({})
  const [allUsers, setAllUsers]         = useState<User[]>([])
  const [showAdd, setShowAdd]           = useState(false)
  const [addingId, setAddingId]         = useState<string | null>(null)
  const [removingId, setRemovingId]     = useState<string | null>(null)
  const [objetos, setObjetos]           = useState<GrupoInstanciaVinculo[]>([])
  const [loadingObjetos, setLoadingObjetos] = useState(false)
  const [objetosExpanded, setObjetosExpanded] = useState(false)

  // Carrega membros, usuários e objetos ao abrir
  useEffect(() => {
    if (!open || !grupo) return
    setLoadingMembros(true)
    setLoadingObjetos(true)
    setShowAdd(false)

    Promise.all([
      api.getGrupoMembros(grupo.id),
      api.getUsers(),
    ]).then(([mems, users]) => {
      setMembros(mems)
      setAllUsers(users)
      setLoadingMembros(false)
    }).catch(() => {
      const membroIds = grupoMembrosMap[grupo.id] ?? []
      setMembros(mockUsers.filter(u => membroIds.includes(u.id)))
      const contaIds = accountMembrosIds[accountId] ?? []
      setAllUsers(mockUsers.filter(u => contaIds.includes(u.id)))
      setLoadingMembros(false)
    })

    // Papel de conta real (member | account_admin) — só existe para grupos com escopo=conta.
    if (accountId) {
      api.getAccountMembros(accountId)
        .then((rows: any[]) => {
          const map: Record<string, string> = {}
          rows.forEach(r => { map[r.id] = r.papel })
          setAccountPapelMap(map)
        })
        .catch(() => setAccountPapelMap({}))
    } else {
      setAccountPapelMap({})
    }

    api.getGrupoInstancias(grupo.id).then(vincs => {
      setObjetos(vincs)
      setLoadingObjetos(false)
    }).catch(() => {
      // Fallback mock
      const memberships = mockInstanciaMembros.filter(
        m => m.entidadeTipo === 'group' && m.entidadeId === grupo.id
      )
      const vincs: GrupoInstanciaVinculo[] = memberships.map(m => {
        const inst = mockInstancias.find(i => i.id === m.instanciaId)
        const comp = inst ? mockComponentes.find(c => c.id === inst.componenteId) : null
        return {
          instanciaId:    m.instanciaId,
          instanciaNome:  inst?.nome ?? m.instanciaId,
          componenteNome: comp?.nome ?? '—',
          papel:          m.papel,
          assignedAt:     m.assignedAt,
        }
      })
      setObjetos(vincs)
      setLoadingObjetos(false)
    })
  }, [open, grupo?.id])

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

  // Adiciona vários usuários de uma vez — mesma tupla FGA (user member group)
  // da atribuição individual, via endpoint bulk idempotente.
  async function handleAddBulk(usersToAdd: User[]) {
    if (!grupo || usersToAdd.length === 0) return
    await api.addGrupoMembrosBulk(grupo.id, usersToAdd.map(u => u.id))
    setMembros(prev => {
      const existentes = new Set(prev.map(m => m.id))
      return [...prev, ...usersToAdd.filter(u => !existentes.has(u.id))]
    })
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

  function handleClose() {
    setMembros([]); setAllUsers([]); setShowAdd(false); setObjetos([])
    onClose()
  }

  if (!grupo) return null

  // ── Render ────────────────────────────────────────────────

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[600px]">
      <NestedSheetHeader onClose={handleClose}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <EscopoBadge escopo={grupo.escopo} />
        </div>
        <NestedSheetTitle>{grupo.nome}</NestedSheetTitle>
        {grupo.descricao && (
          <NestedSheetDescription>{grupo.descricao}</NestedSheetDescription>
        )}
        {accountNome && (
          <div className="flex items-center gap-1.5 mt-2">
            {contextoLabel === 'Org'
              ? <Building  className="w-3 h-3 text-[#9ca3af] shrink-0" />
              : <Building2 className="w-3 h-3 text-[#9ca3af] shrink-0" />}
            <span className="text-xs text-[#6b7280]">
              <span className="text-[#9ca3af]">{contextoLabel ?? 'Conta'}:</span>{' '}
              <span className="font-medium text-[#374151]">{accountNome}</span>
            </span>
          </div>
        )}
      </NestedSheetHeader>

      <NestedSheetBody noPadding>

        {/* ── Seção Objetos com acesso (colapsável) ──────── */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setObjetosExpanded(v => !v)}
            className="w-full flex items-center gap-2 px-6 py-4 hover:bg-gray-50/60 transition-colors text-left"
          >
            {objetosExpanded
              ? <ChevronDown className="w-4 h-4 text-[#6b7280] shrink-0" />
              : <ChevronRight className="w-4 h-4 text-[#6b7280] shrink-0" />}
            <Boxes className="w-4 h-4 text-[#6b7280] shrink-0" />
            <span className="text-sm font-medium text-[#030712]">
              Objetos com acesso
              {!loadingObjetos && (
                <span className="ml-1.5 text-xs font-normal text-[#6b7280]">({objetos.length})</span>
              )}
            </span>
          </button>

          {objetosExpanded && (
            loadingObjetos ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                Carregando objetos...
              </div>
            ) : objetos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-1">
                <p className="text-sm font-medium text-[#030712]">Sem acesso a objetos</p>
                <p className="text-xs text-[#6b7280]">
                  Adicione o grupo a um objeto na aba Objetos desta conta.
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pl-6 pr-3 py-2 text-left text-xs font-medium text-[#6b7280]">Objeto</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-[#6b7280] hidden sm:table-cell">Componente</th>
                    <th className="pr-6 pl-3 py-2 text-left text-xs font-medium text-[#6b7280]">Papel</th>
                  </tr>
                </thead>
                <tbody>
                  {objetos.map(vinc => (
                    <tr
                      key={vinc.instanciaId}
                      className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="pl-6 pr-3 py-3">
                        <p className="text-sm font-medium text-[#030712]">{vinc.instanciaNome}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#6b7280] hidden sm:table-cell">
                        {vinc.componenteNome}
                      </td>
                      <td className="pr-6 pl-3 py-3">
                        <PapelBadge papel={vinc.papel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* ── Seção Membros ─────────────────────────────── */}
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

        {showAdd && (
          <AddMembroSection
            allUsers={allUsers}
            membros={membros}
            onAdd={handleAdd}
            onAddBulk={handleAddBulk}
            disabled={!!addingId}
          />
        )}

        <div>
          {loadingMembros ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              Carregando membros...
            </div>
          ) : membros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-1">
              <p className="text-sm font-medium text-[#030712]">Nenhum membro ainda</p>
              <p className="text-xs text-[#6b7280]">Use o botão acima para adicionar usuários ao grupo.</p>
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
                      <td className="px-3 py-3 hidden sm:table-cell">
                        {accountPapelMap[user.id] === 'account_admin'
                          ? <Badge variant="warning">Administrador da Conta</Badge>
                          : <Badge variant="default">Membro</Badge>}
                      </td>
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

      </NestedSheetBody>

      <NestedSheetFooter>
        <Button variant="ghost" onClick={handleClose}>
          Fechar
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
