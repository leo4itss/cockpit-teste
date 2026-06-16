/**
 * InstanciaDetailSheet — Detalhe de uma instância de componente.
 *
 * Funcionalidades:
 *   - Exibe nome, componente e conta da instância
 *   - Membros: lista com papel (viewer/member/admin) ou ações DocNix
 *
 * Etapa 7: abas Fases / Fluxo Padrão / Perfil de Objeto removidas desta sheet.
 * A complexidade DocNix fica isolada — exposta apenas via ferramentas internas.
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, UserPlus, UserMinus, User as UserIcon, Users, Loader2, Check, X, Shield } from 'lucide-react'
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
import { PermissoesMembroSheet } from '@/components/instancias/PermissoesMembroSheet'
import { api } from '@/api/client'
import { useCanManageInstanciaMembros } from '@/authz/hooks'
import { mockDocNixPapeis, getComponenteConfig } from '@/authz/mock'
import { cn } from '@/lib/utils'
import type {
  Instancia, InstanciaMembro, User, Grupo, Atribuicao,
} from '@/types'
import {
  users          as mockUsers,
  grupos         as mockGrupos,
  accounts       as mockAccounts,
  accountMembrosIds,
  instanciaMembros as mockInstMembros,
} from '@/data/mock'

// ── Tipos internos ────────────────────────────────────────────

interface Props {
  open:                  boolean
  onClose:               () => void
  instancia:             Instancia | null
  componenteNome?:       string
  componenteTipoModelo?: 'fga' | 'docnix' | 'custom'
  accountNome?:          string
  accountId?:            string
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
  { value: 'viewer', label: 'Visualizador', desc: 'Apenas leitura',    cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'member', label: 'Membro',       desc: 'Uso padrão',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'admin',  label: 'Administrador', desc: 'Acesso completo',  cls: 'bg-orange-50 text-orange-700 border-orange-200' },
]

function PapelBadge({ papel }: { papel: string }) {
  // Tenta primeiro PAPEIS_INSTANCIA (FGA), depois mockDocNixPapeis (DocNix)
  const fga = PAPEIS_INSTANCIA.find(p => p.value === papel)
  if (fga) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${fga.cls}`}>
        {fga.label}
      </span>
    )
  }
  const docnix = mockDocNixPapeis.find(p => p.value === papel)
  if (docnix) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${docnix.cls}`}>
        {docnix.label}
      </span>
    )
  }
  if (papel === 'personalizado') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
        Personalizado
      </span>
    )
  }
  return <span className="text-xs text-gray-400">—</span>
}

// Editor inline de papel para membro de instância FGA (Viewer/Member/Admin)
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
    try { await onSave(draft) }
    finally { setSaving(false); setEditing(false) }
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

// Editor inline de papel para membro de instância DocNix (usa mockDocNixPapeis)
function PapelEditorDocNix({
  papel, modulo, onSave,
}: { papel: string; modulo: string | null; onSave: (novo: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(papel)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { setDraft(papel); setEditing(false) }, [papel])

  const papeis = modulo
    ? mockDocNixPapeis.filter(p => p.modulo === modulo)
    : mockDocNixPapeis

  async function handleSave() {
    if (draft === papel) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft) }
    finally { setSaving(false); setEditing(false) }
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
        {papeis.map(p => (
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
  allUsers, allGrupos, membros, onAdd, disabled, atribuicoes,
}: {
  allUsers:    User[]
  allGrupos:   Grupo[]
  membros:     InstanciaMembro[]
  onAdd:       (entidadeTipo: 'user' | 'group', entidadeId: string, nome: string, papel: string, atribuicaoIds: string[]) => void
  disabled?:   boolean
  atribuicoes: Atribuicao[]
}) {
  const [search, setSearch]                     = useState('')
  const [papel, setPapel]                       = useState<'viewer' | 'member' | 'admin'>('viewer')
  const [selectedAtribuicoes, setSelectedAtribuicoes] = useState<string[]>([])
  const [papelDocNix, setPapelDocNix]           = useState<string>('personalizado')

  const jaMembroIds = new Set(membros.map(m => m.entidadeId))
  const atribuicoesAtivas = atribuicoes.filter(a => a.status === 'Ativo')

  // Detecta o módulo (MaxDoc / DocAction) a partir das atribuições ativas
  const moduloDetectado = atribuicoesAtivas.find(a => a.modulo)?.modulo ?? null
  const papeisDocNix = moduloDetectado
    ? mockDocNixPapeis.filter(p => p.modulo === moduloDetectado)
    : []

  function handlePapelDocNix(valor: string) {
    setPapelDocNix(valor)
    const p = mockDocNixPapeis.find(x => x.value === valor)
    if (!p) { setSelectedAtribuicoes([]); return }
    const ids = p.atribuicaoNomes.length === 0
      ? atribuicoesAtivas.map(a => a.id)
      : atribuicoesAtivas.filter(a => p.atribuicaoNomes.includes(a.nome)).map(a => a.id)
    setSelectedAtribuicoes(ids)
  }

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
    onAdd(item.tipo, item.id, item.nome, papel, selectedAtribuicoes)
    setSearch('')
    setSelectedAtribuicoes([])
    setPapelDocNix('personalizado')
  }

  return (
    <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/60 space-y-2">
      {/* Seletor de papel / ações */}
      {atribuicoesAtivas.length === 0 ? (
        /* FGA — seletor de papel fixo */
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
      ) : papeisDocNix.length > 0 ? (
        /* DocNix — role cards + checkboxes colapsáveis */
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">Papel</p>
          <div className="grid grid-cols-3 gap-1.5">
            {papeisDocNix.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => handlePapelDocNix(p.value)}
                className={cn(
                  'flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors',
                  papelDocNix === p.value
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
              >
                <span className="text-xs font-medium text-[#030712]">{p.label}</span>
                <span className="text-[10px] text-[#6b7280] mt-0.5 leading-tight">{p.desc}</span>
              </button>
            ))}
            {/* Card Personalizado */}
            <button
              type="button"
              onClick={() => { setPapelDocNix('personalizado'); setSelectedAtribuicoes([]) }}
              className={cn(
                'flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors',
                papelDocNix === 'personalizado'
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              )}
            >
              <span className="text-xs font-medium text-[#030712]">Personalizado</span>
              <span className="text-[10px] text-[#6b7280] mt-0.5 leading-tight">Selecionar manualmente</span>
            </button>
          </div>

          {/* Checkboxes colapsáveis — abertos no modo Personalizado */}
          <details open={papelDocNix === 'personalizado'}>
            <summary className="text-xs text-blue-600 cursor-pointer hover:underline select-none">
              {selectedAtribuicoes.length > 0
                ? `${selectedAtribuicoes.length} ações selecionadas ▾`
                : 'Ver ações ▾'}
            </summary>
            <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
              {atribuicoesAtivas.map(a => (
                <label key={a.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={selectedAtribuicoes.includes(a.id)}
                    onChange={e => {
                      setPapelDocNix('personalizado')
                      if (e.target.checked) {
                        setSelectedAtribuicoes(prev => [...prev, a.id])
                      } else {
                        setSelectedAtribuicoes(prev => prev.filter(id => id !== a.id))
                      }
                    }}
                    className="rounded"
                  />
                  <span>{a.nome}</span>
                  {a.modulo && <span className="text-[#9ca3af]">({a.modulo})</span>}
                </label>
              ))}
            </div>
          </details>
        </div>
      ) : (
        /* DocNix sem módulo reconhecido — fallback checkboxes */
        <div>
          <label className="text-xs text-gray-500 font-medium">Ações</label>
          <div className="mt-1 space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2 bg-white">
            {atribuicoesAtivas.map(a => (
              <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={selectedAtribuicoes.includes(a.id)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedAtribuicoes(prev => [...prev, a.id])
                    } else {
                      setSelectedAtribuicoes(prev => prev.filter(id => id !== a.id))
                    }
                  }}
                  className="rounded"
                />
                <span>{a.nome}</span>
                {a.modulo && <span className="text-xs text-gray-400">({a.modulo})</span>}
              </label>
            ))}
          </div>
        </div>
      )}

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

// ── Slot de perfil com filtro por atribuição (DocNix) ─────────

// ── Componente principal ──────────────────────────────────────

export function InstanciaDetailSheet({
  open, onClose, instancia, componenteNome, componenteTipoModelo = 'fga', accountNome, accountId = 'acc-comgas',
}: Props) {
  // ── State: Membros ────────────────────────────────────────
  const [membros, setMembros]                   = useState<InstanciaMembro[]>([])
  const [loading, setLoading]                   = useState(false)
  const [allUsers, setAllUsers]                 = useState<User[]>([])
  const [allGrupos, setAllGrupos]               = useState<Grupo[]>([])
  const [showAdd, setShowAdd]                   = useState(false)
  const [addingId, setAddingId]                 = useState<string | null>(null)
  const [removingId, setRemovingId]             = useState<string | null>(null)
  // Sheet unificado de permissões por membro (FGA ou DocNix)
  const [showPermissoes, setShowPermissoes]     = useState(false)
  const [membroPermissoes, setMembroPermissoes] = useState<InstanciaMembro | null>(null)
  // Atribuições do componente (para multi-select ao adicionar membro)
  const [atribuicoes, setAtribuicoes]           = useState<Atribuicao[]>([])

  // ── State: Restringir Acesso (local para refletir toggle imediatamente) ──
  const [restringirAcesso, setRestringirAcesso] = useState(instancia?.restringirAcesso ?? false)

  const canManage = useCanManageInstanciaMembros(instancia?.id ?? '', accountId)

  // Só rebusca quando a instância ou conta muda — não ao abrir/fechar.
  useEffect(() => {
    if (!instancia) return
    setLoading(true)
    setShowAdd(false)
    setRestringirAcesso(instancia.restringirAcesso ?? false)

    Promise.all([
      api.getInstanciaMembros(instancia.id),
      api.getUsers(),
      api.getGrupos({ accountId }),
    ]).then(([mems, users, grupos]) => {
      setMembros(mems)
      setAllUsers(users)
      setAllGrupos(grupos)
      setLoading(false)
    }).catch(() => {
      // Fallback mock quando Neon está hibernando
      setMembros(mockInstMembros.filter(m => m.instanciaId === instancia.id))
      const contaIds = accountMembrosIds[accountId] ?? []
      setAllUsers(mockUsers.filter(u => contaIds.includes(u.id)))
      // Inclui grupos da conta E grupos org-scoped da org à qual a conta pertence
      const orgIdDaConta = mockAccounts.find(a => a.id === accountId)?.orgId
      setAllGrupos(mockGrupos.filter(g =>
        g.accountId === accountId || (orgIdDaConta && g.orgId === orgIdDaConta)
      ))
      setLoading(false)
    })
  }, [instancia?.id, accountId])

  // Carregar atribuições do componente quando a instância muda
  useEffect(() => {
    if (instancia?.componenteId) {
      api.getAtribuicoes(instancia.componenteId)
        .then(setAtribuicoes)
        .catch(() => setAtribuicoes([]))
    }
  }, [instancia?.componenteId])

  async function handleAdd(
    entidadeTipo: 'user' | 'group',
    entidadeId: string,
    displayName: string,
    papel: string,
    atribuicaoIds: string[],
  ) {
    if (!instancia) return
    setAddingId(entidadeId)
    try {
      const row = await api.addInstanciaMembro(instancia.id, { entidadeTipo, entidadeId, papel })
      setMembros(prev => {
        const already = prev.find(m => m.entidadeId === entidadeId && m.entidadeTipo === entidadeTipo)
        if (already) return prev.map(m => m.entidadeId === entidadeId ? { ...m, papel: row.papel } : m)
        return [...prev, { ...row, displayName }]
      })
      // Adicionar atribuições selecionadas
      if (atribuicaoIds.length > 0 && row.id) {
        await Promise.all(
          atribuicaoIds.map(atribId =>
            api.addMembroAtribuicao(instancia.id, row.id, atribId).catch(() => null)
          )
        )
      }
    } finally {
      setAddingId(null)
    }
  }

  async function handleSavePapel(membro: InstanciaMembro, novoPapel: string) {
    if (!instancia) return
    // Optimistic update
    setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, papel: novoPapel as 'viewer' | 'member' | 'admin' } : m))
    try {
      // 1. Salvar o rótulo do papel
      await api.updateInstanciaMembro(instancia.id, membro.id, novoPapel)

      // 2. Para DocNix: sincronizar instancia_membro_atribuicoes com o papel escolhido
      if (isDocNix) {
        const papelInfo = mockDocNixPapeis.find(p => p.value === novoPapel)
        if (papelInfo) {
          const atribuicoesAtivas = atribuicoes.filter(a => a.status === 'Ativo')
          const novasIds = papelInfo.atribuicaoNomes.length === 0
            ? atribuicoesAtivas.map(a => a.id)
            : atribuicoesAtivas.filter(a => papelInfo.atribuicaoNomes.includes(a.nome)).map(a => a.id)

          const atuais = await api.getMembroAtribuicoes(instancia.id, membro.id)
          const atualIds = (atuais as { atribuicaoId: string }[]).map(v => v.atribuicaoId)

          const toAdd    = novasIds.filter(id => !atualIds.includes(id))
          const toRemove = atualIds.filter(id => !novasIds.includes(id))

          await Promise.all([
            ...toAdd.map(id    => api.addMembroAtribuicao(instancia!.id, membro.id, id).catch(() => null)),
            ...toRemove.map(id => api.removeMembroAtribuicao(instancia!.id, membro.id, id).catch(() => null)),
          ])
        }
      }
    } catch { /* silencioso — mudança já aplicada localmente */ }
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
    // Não limpa `membros` para preservar edições locais ao reabrir a mesma instância
    setShowAdd(false)
    setShowPermissoes(false); setMembroPermissoes(null)
    onClose()
  }

  // Modelo DocNix: determinado exclusivamente pelo tipoModelo do componente pai.
  // Não usar fallback por atribuições — instâncias FGA também podem ter atribuições carregadas.
  const isDocNix = componenteTipoModelo === 'docnix'
  const atribuicoesDocnix = isDocNix  // mantém compatibilidade com usos existentes

  const grupoNomes = useMemo(
    () => Object.fromEntries(allGrupos.map(g => [g.id, g.nome])),
    [allGrupos],
  )

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
        {/* ── Conteúdo: Membros ─────────────────────────────── */}
        <>

            {/* Toggle: Restringir Acesso — exclusivo DocNix */}
            {canManage && isDocNix && (
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/60">
                <div>
                  <p className="text-xs font-medium text-gray-700">Restringir acesso</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {restringirAcesso
                      ? 'Ativo — somente membros com atribuição enxergam esta instância'
                      : 'Inativo — qualquer usuário da conta pode enxergar esta instância'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const novoValor = !restringirAcesso
                    setRestringirAcesso(novoValor)   // atualiza localmente de imediato
                    try {
                      await fetch(`/api/instancias/${instancia!.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ restringirAcesso: novoValor }),
                      })
                    } catch {
                      setRestringirAcesso(!novoValor) // reverte em caso de erro
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                    restringirAcesso ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    restringirAcesso ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )}

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

            {/* Seção de adicionar membro */}
            {showAdd && canManage && (
              <AddMembroSection
                allUsers={allUsers}
                allGrupos={allGrupos}
                membros={membros}
                onAdd={handleAdd}
                disabled={!!addingId}
                atribuicoes={atribuicoes}
              />
            )}

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
              ) : (() => {
                // Separa grupos de usuários individuais
                const gruposMembros   = membros.filter(m => m.entidadeTipo === 'group')
                const usuariosMembros = membros.filter(m => m.entidadeTipo === 'user')

                function renderRow(membro: typeof membros[number]) {
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
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {canManage && !atribuicoesDocnix ? (
                          <PapelEditor
                            papel={membro.papel}
                            onSave={(novo) => handleSavePapel(membro, novo)}
                          />
                        ) : canManage && atribuicoesDocnix ? (
                          <PapelEditorDocNix
                            papel={membro.papel}
                            modulo={componenteNome ?? null}
                            onSave={(novo) => handleSavePapel(membro, novo)}
                          />
                        ) : (
                          <PapelBadge papel={membro.papel} />
                        )}
                      </td>
                      <td className="pr-6 pl-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 invisible group-hover:visible">
                          <button
                            onClick={() => { setMembroPermissoes(membro); setShowPermissoes(true) }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Ver e editar permissões"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            Ações
                          </button>
                          {canManage && (
                            <button
                              onClick={() => handleRemove(membro)}
                              disabled={isRemoving || !!addingId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Remover do objeto"
                            >
                              {isRemoving
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <UserMinus className="w-3.5 h-3.5" />}
                              Remover
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <div className="flex flex-col">
                    {/* Grupos */}
                    {gruposMembros.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 px-6 py-2 bg-violet-50 border-b border-violet-100">
                          <Users className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span className="text-xs font-medium text-violet-700">
                            Grupos ({gruposMembros.length})
                          </span>
                          <span className="text-xs text-violet-400 ml-1">
                            — membros dos grupos herdarão este acesso
                          </span>
                        </div>
                        <table className="w-full">
                          <tbody>{gruposMembros.map(renderRow)}</tbody>
                        </table>
                      </>
                    )}

                    {/* Usuários */}
                    {usuariosMembros.length > 0 && (
                      <>
                        {gruposMembros.length > 0 && (
                          <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 border-b border-gray-100 border-t border-t-gray-200">
                            <UserIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-xs font-medium text-gray-600">
                              Usuários ({usuariosMembros.length})
                            </span>
                          </div>
                        )}
                        <table className="w-full">
                          <tbody>{usuariosMembros.map(renderRow)}</tbody>
                        </table>
                      </>
                    )}
                  </div>
                )
              })()}
            </div>

          </>
        </NestedSheetBody>

      <NestedSheetFooter className="justify-end">
        <Button variant="ghost" onClick={handleClose}>Fechar</Button>
      </NestedSheetFooter>

      {/* Sheet unificado de permissões (FGA ou DocNix) */}
      {membroPermissoes && instancia && (
        <PermissoesMembroSheet
          open={showPermissoes}
          onClose={() => { setShowPermissoes(false); setMembroPermissoes(null) }}
          instanciaId={instancia.id}
          instanciaNome={instancia.nome}
          componenteId={instancia.componenteId}
          componenteNome={componenteNome}
          componenteTipoModelo={componenteTipoModelo}
          membro={membroPermissoes}
          accountId={accountId}
          grupoNomes={grupoNomes}
          onSaved={() => {
            // Recarregar membros após salvar permissões
            api.getInstanciaMembros(instancia.id).then(setMembros).catch(() => {})
          }}
        />
      )}
    </NestedSheet>
  )
}
