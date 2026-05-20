/**
 * InstanciaDetailSheet — Detalhe de uma instância de componente.
 *
 * Funcionalidades:
 *   - Exibe nome, componente e conta da instância
 *   - Lista membros (usuários e grupos) com papel (viewer/member/admin)
 *   - Adicionar membro (usuário ou grupo) com seleção de papel
 *   - Editar papel inline via dropdown
 *   - Remover membro (hover-reveal)
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, UserPlus, UserMinus, Users, Loader2, Check, X, Shield } from 'lucide-react'
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
import { useCanManageInstanciaMembros } from '@/authz/hooks'
import { cn } from '@/lib/utils'
import type { Instancia, InstanciaMembro, User, Grupo } from '@/types'

// ── Tipos internos ────────────────────────────────────────────

interface Props {
  open:          boolean
  onClose:       () => void
  instancia:     Instancia | null
  componenteNome?: string
  accountNome?:  string
  accountId?:    string
}

// ── Helpers visuais ───────────────────────────────────────────

function Avatar({ nome, isGroup }: { nome: string; isGroup?: boolean }) {
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className={cn(
      'w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold select-none',
      isGroup
        ? 'bg-violet-100 text-violet-600'
        : 'bg-[#e5e7eb] text-[#6b7280]'
    )}>
      {isGroup ? <Users className="w-4 h-4" /> : ini}
    </div>
  )
}

const PAPEIS_INSTANCIA = [
  { value: 'viewer', label: 'Viewer', desc: 'Apenas leitura',    cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'member', label: 'Member', desc: 'Uso padrão',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'admin',  label: 'Admin',  desc: 'Acesso completo',   cls: 'bg-orange-50 text-orange-700 border-orange-200' },
]

function PapelBadge({ papel }: { papel: string }) {
  const opt = PAPEIS_INSTANCIA.find(p => p.value === papel)
  if (!opt) return <span className="text-xs text-gray-400">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${opt.cls}`}>
      {opt.label}
    </span>
  )
}

// Editor inline de papel para membro de instância
function PapelEditor({
  papel, onSave,
}: { papel: string; onSave: (novo: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(papel)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { setDraft(papel); setEditing(false) }, [papel])

  async function handleSave() {
    if (draft === papel) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft); setEditing(false) }
    finally { setSaving(false) }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="group flex items-center gap-1" title="Editar papel">
        <PapelBadge papel={papel} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={draft}
        onChange={e => setDraft(e.target.value)}
        disabled={saving}
        autoFocus
        className="text-xs border border-gray-300 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {PAPEIS_INSTANCIA.map(p => (
          <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
        ))}
      </select>
      <button onClick={handleSave} disabled={saving} className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50" title="Confirmar">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => { setDraft(papel); setEditing(false) }} disabled={saving} className="p-1 rounded text-gray-400 hover:bg-gray-100 transition-colors" title="Cancelar">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Seção de busca para adicionar usuário ou grupo
function AddMembroSection({
  allUsers, allGrupos, membros, onAdd, disabled,
}: {
  allUsers:  User[]
  allGrupos: Grupo[]
  membros:   InstanciaMembro[]
  onAdd:     (entidadeTipo: 'user' | 'group', entidadeId: string, nome: string, papel: string) => void
  disabled?: boolean
}) {
  const [search, setSearch]   = useState('')
  const [papel, setPapel]     = useState<'viewer' | 'member' | 'admin'>('viewer')

  const jaMembroIds = new Set(membros.map(m => m.entidadeId))

  const sugestoes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    const users: Array<{ id: string; nome: string; sub: string; tipo: 'user' | 'group' }> = allUsers
      .filter(u => !jaMembroIds.has(u.id) && (
        u.nomeCompleto.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      ))
      .slice(0, 3)
      .map(u => ({ id: u.id, nome: u.nomeCompleto, sub: u.email, tipo: 'user' as const }))

    const grupos: Array<{ id: string; nome: string; sub: string; tipo: 'user' | 'group' }> = allGrupos
      .filter(g => !jaMembroIds.has(g.id) && g.nome.toLowerCase().includes(q))
      .slice(0, 3)
      .map(g => ({ id: g.id, nome: g.nome, sub: 'Grupo', tipo: 'group' as const }))

    return [...users, ...grupos].slice(0, 6)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, allUsers, allGrupos, membros.length])

  function select(item: { id: string; nome: string; tipo: 'user' | 'group' }) {
    onAdd(item.tipo, item.id, item.nome, papel)
    setSearch('')
  }

  return (
    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 space-y-2">
      {/* Seletor de papel */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Papel:</span>
        {PAPEIS_INSTANCIA.map(p => (
          <button
            key={p.value}
            onClick={() => setPapel(p.value as 'viewer' | 'member' | 'admin')}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
              papel === p.value ? p.cls : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Busca de usuário ou grupo */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar usuário ou grupo..."
            disabled={disabled}
            className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 leading-none text-base">×</button>
          )}
        </div>

        {sugestoes.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
            {sugestoes.map(item => (
              <button
                key={`${item.tipo}-${item.id}`}
                onClick={() => select(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <Avatar nome={item.nome} isGroup={item.tipo === 'group'} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#030712] truncate">{item.nome}</p>
                  <p className="text-xs text-[#6b7280] truncate">{item.sub}</p>
                </div>
                <span className={cn(
                  'ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium',
                  item.tipo === 'group' ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-500'
                )}>
                  {item.tipo === 'group' ? 'grupo' : 'usuário'}
                </span>
              </button>
            ))}
          </div>
        )}

        {search.trim().length > 0 && sugestoes.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 px-4 py-3">
            <p className="text-sm text-[#6b7280]">Nenhum usuário ou grupo encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────

export function InstanciaDetailSheet({
  open, onClose, instancia, componenteNome, accountNome, accountId = 'acc-comgas',
}: Props) {
  const [membros, setMembros]                   = useState<InstanciaMembro[]>([])
  const [loading, setLoading]                   = useState(false)
  const [allUsers, setAllUsers]                 = useState<User[]>([])
  const [allGrupos, setAllGrupos]               = useState<Grupo[]>([])
  const [showAdd, setShowAdd]                   = useState(false)
  const [addingId, setAddingId]                 = useState<string | null>(null)
  const [removingId, setRemovingId]             = useState<string | null>(null)
  // Permissões granulares por membro
  const [showPermissoes, setShowPermissoes]     = useState(false)
  const [membroPermissoes, setMembroPermissoes] = useState<InstanciaMembro | null>(null)

  const canManage = useCanManageInstanciaMembros(instancia?.id ?? '', accountId)

  useEffect(() => {
    if (!open || !instancia) return
    setLoading(true)
    setShowAdd(false)

    Promise.all([
      api.getInstanciaMembros(instancia.id),
      api.getUsers(),
      api.getGrupos({ accountId }),
    ]).then(([mems, users, grupos]) => {
      setMembros(mems)
      setAllUsers(users)
      setAllGrupos(grupos)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [open, instancia?.id, accountId])

  async function handleAdd(entidadeTipo: 'user' | 'group', entidadeId: string, displayName: string, papel: string) {
    if (!instancia) return
    setAddingId(entidadeId)
    try {
      const row = await api.addInstanciaMembro(instancia.id, { entidadeTipo, entidadeId, papel })
      setMembros(prev => {
        const already = prev.find(m => m.entidadeId === entidadeId && m.entidadeTipo === entidadeTipo)
        if (already) return prev.map(m => m.entidadeId === entidadeId ? { ...m, papel: row.papel } : m)
        return [...prev, { ...row, displayName }]
      })
    } finally {
      setAddingId(null)
    }
  }

  async function handleSavePapel(membro: InstanciaMembro, novoPapel: string) {
    if (!instancia) return
    await api.addInstanciaMembro(instancia.id, {
      entidadeTipo: membro.entidadeTipo,
      entidadeId:   membro.entidadeId,
      papel:        novoPapel,
    })
    setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, papel: novoPapel as 'viewer' | 'member' | 'admin' } : m))
  }

  async function handleRemove(membro: InstanciaMembro) {
    if (!instancia) return
    if (!confirm(`Remover ${membro.displayName ?? membro.entidadeId} desta instância?`)) return
    setRemovingId(membro.id)
    try {
      await api.removeInstanciaMembro(instancia.id, membro.id)
      setMembros(prev => prev.filter(m => m.id !== membro.id))
    } finally {
      setRemovingId(null)
    }
  }

  function handleClose() {
    setMembros([]); setAllUsers([]); setAllGrupos([]); setShowAdd(false)
    setShowPermissoes(false); setMembroPermissoes(null)
    onClose()
  }

  if (!instancia) return null

  // Badge de tipo do componente
  const tipoLabel = componenteNome
    ? componenteNome
    : instancia.componenteId.replace('comp-', '').replace(/-/g, ' ')

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[600px]">
      <NestedSheetHeader onClose={handleClose}>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="default" className="bg-blue-50 text-blue-700 border border-blue-200">
            {tipoLabel}
          </Badge>
          {accountNome && (
            <span className="text-xs text-gray-500">{accountNome}</span>
          )}
        </div>
        <NestedSheetTitle>{instancia.nome}</NestedSheetTitle>
        {instancia.descricao && (
          <NestedSheetDescription>{instancia.descricao}</NestedSheetDescription>
        )}
      </NestedSheetHeader>

      <NestedSheetBody noPadding>
        {/* Barra de membros */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-[#030712]">
            Membros
            {!loading && (
              <span className="ml-1.5 text-xs font-normal text-[#6b7280]">({membros.length})</span>
            )}
          </p>
          {canManage && (
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
          )}
        </div>

        {/* Lista de membros */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Carregando membros...
            </div>
          ) : membros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm font-medium text-[#030712]">Nenhum membro ainda</p>
              <p className="text-xs text-[#6b7280]">
                {canManage ? 'Use o botão acima para adicionar usuários ou grupos.' : 'Esta instância ainda não tem membros.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {membros.map(membro => {
                  const isGroup    = membro.entidadeTipo === 'group'
                  const isRemoving = removingId === membro.id
                  const nome       = membro.displayName ?? membro.entidadeId

                  return (
                    <tr
                      key={membro.id}
                      className="group border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-b-0"
                    >
                      <td className="pl-6 pr-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nome={nome} isGroup={isGroup} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#030712] truncate">{nome}</p>
                            {membro.email && (
                              <p className="text-xs text-[#6b7280] truncate">{membro.email}</p>
                            )}
                            {isGroup && (
                              <p className="text-xs text-violet-500">Grupo</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {canManage ? (
                          <PapelEditor
                            papel={membro.papel}
                            onSave={(novo) => handleSavePapel(membro, novo)}
                          />
                        ) : (
                          <PapelBadge papel={membro.papel} />
                        )}
                      </td>
                      {canManage && (
                        <td className="pr-6 pl-3 py-3 text-right">
                          <div className="invisible group-hover:visible flex items-center justify-end gap-1">
                            {/* Permissões granulares (apenas usuários) */}
                            {membro.entidadeTipo === 'user' && (
                              <button
                                onClick={() => { setMembroPermissoes(membro); setShowPermissoes(true) }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Permissões granulares"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                Permissões
                              </button>
                            )}
                            <button
                              onClick={() => handleRemove(membro)}
                              disabled={isRemoving || !!addingId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Remover da instância"
                            >
                              {isRemoving
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <UserMinus className="w-3.5 h-3.5" />}
                              Remover
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Seção de adicionar membro */}
        {showAdd && canManage && (
          <AddMembroSection
            allUsers={allUsers}
            allGrupos={allGrupos}
            membros={membros}
            onAdd={handleAdd}
            disabled={!!addingId}
          />
        )}
      </NestedSheetBody>

      <NestedSheetFooter className="justify-end">
        <Button variant="ghost" onClick={handleClose}>Fechar</Button>
      </NestedSheetFooter>

      {/* Sheet de permissões granulares por membro dentro da instância */}
      {membroPermissoes && (
        <AtribuirPermissoesSheet
          open={showPermissoes}
          onClose={() => { setShowPermissoes(false); setMembroPermissoes(null) }}
          entityType="usuario"
          entityId={membroPermissoes.entidadeId}
          entityNome={membroPermissoes.displayName ?? membroPermissoes.entidadeId}
          accountId={accountId}
          instanciaId={instancia.id}
          instanciaComponenteId={instancia.componenteId}
          instanciaNome={instancia.nome}
        />
      )}
    </NestedSheet>
  )
}
