/**
 * InstanciaPage — Página dedicada de gerenciamento de membros e roles de uma instância.
 *
 * Rota: /instancia/:id
 *
 * Foco: membros + roles (DocNix ou FGA).
 * Layout 2 colunas: lista de membros (esquerda) + painel de adição (direita).
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, UserPlus, UserMinus, Users, Loader2, Check, X, Shield, Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/api/client'
import { mockDocNixPapeis } from '@/authz/mock'
import { PermissoesMembroSheet } from '@/components/instancias/PermissoesMembroSheet'
import { cn } from '@/lib/utils'
import type { Instancia, InstanciaMembro, User, Grupo, Atribuicao } from '@/types'
import {
  users       as mockUsers,
  grupos      as mockGrupos,
  accountMembrosIds,
  instanciaMembros as mockInstMembros,
} from '@/data/mock'

// ── Tipos ─────────────────────────────────────────────────────

interface ComponenteInfo {
  id:         string
  nome:       string
  tipoModelo: 'fga' | 'docnix' | 'custom'
}

// ── Helpers visuais ───────────────────────────────────────────

const PAPEIS_FGA = [
  { value: 'viewer', label: 'Visualizador', desc: 'Apenas leitura',    cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'member', label: 'Membro',       desc: 'Uso padrão',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'admin',  label: 'Administrador', desc: 'Acesso completo',  cls: 'bg-orange-50 text-orange-700 border-orange-200' },
]

function Avatar({ nome, isGroup }: { nome: string; isGroup?: boolean }) {
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className={cn(
      'w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold select-none',
      isGroup ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
    )}>
      {isGroup ? <Users className="w-4 h-4" /> : ini}
    </div>
  )
}

function PapelBadge({ papel }: { papel: string }) {
  const fga = PAPEIS_FGA.find(p => p.value === papel)
  if (fga) return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${fga.cls}`}>
      {fga.label}
    </span>
  )
  const dnx = mockDocNixPapeis.find(p => p.value === papel)
  if (dnx) return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${dnx.cls}`}>
      {dnx.label}
    </span>
  )
  if (papel === 'personalizado') return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
      Personalizado
    </span>
  )
  return <span className="text-sm text-gray-400">—</span>
}

// ── Seletor de papel inline (FGA) ─────────────────────────────

function PapelEditorFGA({
  papel, onSave,
}: { papel: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(papel)
  const [saving, setSaving]   = useState(false)
  useEffect(() => { setDraft(papel); setEditing(false) }, [papel])

  if (!editing) return (
    <button onClick={() => setEditing(true)} title="Editar papel">
      <PapelBadge papel={papel} />
    </button>
  )
  return (
    <div className="flex items-center gap-1.5">
      <select value={draft} onChange={e => setDraft(e.target.value)} disabled={saving} autoFocus
        className="text-xs border border-gray-300 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        {PAPEIS_FGA.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <button onClick={async () => { setSaving(true); try { await onSave(draft) } finally { setSaving(false); setEditing(false) } }}
        disabled={saving} className="p-1 rounded text-green-600 hover:bg-green-50" title="Confirmar">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => { setDraft(papel); setEditing(false) }} disabled={saving}
        className="p-1 rounded text-gray-400 hover:bg-gray-100" title="Cancelar">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Seletor de papel inline (DocNix) ─────────────────────────

function PapelEditorDocNix({
  papel, modulo, onSave,
}: { papel: string; modulo: string | null; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(papel)
  const [saving, setSaving]   = useState(false)
  useEffect(() => { setDraft(papel); setEditing(false) }, [papel])

  const papeis = modulo ? mockDocNixPapeis.filter(p => p.modulo === modulo) : mockDocNixPapeis

  if (!editing) return (
    <button onClick={() => setEditing(true)} title="Editar papel">
      <PapelBadge papel={papel} />
    </button>
  )
  return (
    <div className="flex items-center gap-1.5">
      <select value={draft} onChange={e => setDraft(e.target.value)} disabled={saving} autoFocus
        className="text-sm border border-gray-300 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        {draft === 'personalizado' && (
          <option value="personalizado" disabled>Personalizado (selecione um papel)</option>
        )}
        {papeis.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <button onClick={async () => { setSaving(true); try { await onSave(draft) } finally { setSaving(false); setEditing(false) } }}
        disabled={saving} className="p-1 rounded text-green-600 hover:bg-green-50" title="Confirmar">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
      </button>
      <button onClick={() => { setDraft(papel); setEditing(false) }} disabled={saving}
        className="p-1 rounded text-gray-400 hover:bg-gray-100" title="Cancelar">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Painel de adição de membro ────────────────────────────────

function AddMembroPanel({
  allUsers, allGrupos, membros, atribuicoes, isDocNix, modulo, onAdd, onClose,
}: {
  allUsers:    User[]
  allGrupos:   Grupo[]
  membros:     InstanciaMembro[]
  atribuicoes: Atribuicao[]
  isDocNix:    boolean
  modulo:      string | null
  onAdd:       (tipo: 'user' | 'group', id: string, nome: string, papel: string) => void
  onClose:     () => void
}) {
  const [search, setSearch]                           = useState('')
  const [papelFGA, setPapelFGA]                       = useState<string>('viewer')
  const [papelDocNix, setPapelDocNix]                 = useState<string>('personalizado')
  const [selectedAtribuicoes, setSelectedAtribuicoes] = useState<string[]>([])

  const atribuicoesAtivas = atribuicoes.filter(a => a.status === 'Ativo')
  const papeisDocNix = modulo ? mockDocNixPapeis.filter(p => p.modulo === modulo) : []

  const jaMembroIds = new Set(membros.map(m => m.entidadeId))

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
    const users = allUsers
      .filter(u => !jaMembroIds.has(u.id) && (
        u.nomeCompleto.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      ))
      .slice(0, 4)
      .map(u => ({ id: u.id, nome: u.nomeCompleto, sub: u.email, tipo: 'user' as const }))
    const grupos = allGrupos
      .filter(g => !jaMembroIds.has(g.id) && g.nome.toLowerCase().includes(q))
      .slice(0, 3)
      .map(g => ({ id: g.id, nome: g.nome, sub: 'Grupo', tipo: 'group' as const }))
    return [...users, ...grupos].slice(0, 6)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, allUsers, allGrupos, membros.length])

  function select(item: { id: string; nome: string; tipo: 'user' | 'group' }) {
    onAdd(item.tipo, item.id, item.nome, isDocNix ? papelDocNix : papelFGA)
    setSearch('')
    setSelectedAtribuicoes([])
    setPapelDocNix('personalizado')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-900">Adicionar membro</h3>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-500">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Seletor de papel */}
        {!isDocNix ? (
          /* FGA */
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Papel</p>
            <div className="flex flex-wrap gap-2">
              {PAPEIS_FGA.map(p => (
                <button key={p.value} onClick={() => setPapelFGA(p.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                    papelFGA === p.value ? p.cls : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : papeisDocNix.length > 0 ? (
          /* DocNix com módulo reconhecido */
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Papel</p>
            <div className="grid grid-cols-2 gap-2">
              {papeisDocNix.map(p => (
                <button key={p.value} type="button" onClick={() => handlePapelDocNix(p.value)}
                  className={cn(
                    'flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-colors',
                    papelDocNix === p.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}>
                  <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                  <span className="text-xs text-gray-500 mt-0.5 leading-tight">{p.desc}</span>
                </button>
              ))}
              <button type="button"
                onClick={() => { setPapelDocNix('personalizado'); setSelectedAtribuicoes([]) }}
                className={cn(
                  'flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-colors',
                  papelDocNix === 'personalizado'
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}>
                <span className="text-sm font-semibold text-gray-900">Personalizado</span>
                <span className="text-xs text-gray-500 mt-0.5 leading-tight">Selecionar manualmente</span>
              </button>
            </div>

            {/* Atribuições colapsáveis */}
            {atribuicoesAtivas.length > 0 && (
              <details open={papelDocNix === 'personalizado'} className="mt-3">
                <summary className="text-sm text-blue-600 cursor-pointer hover:underline select-none font-medium">
                  {selectedAtribuicoes.length > 0
                    ? `${selectedAtribuicoes.length} ações selecionadas`
                    : 'Ver ações detalhadas'}
                </summary>
                <div className="mt-2 border border-gray-200 rounded-xl bg-white overflow-hidden">
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {atribuicoesAtivas.map(a => (
                      <label key={a.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                        <input type="checkbox"
                          checked={selectedAtribuicoes.includes(a.id)}
                          onChange={e => {
                            setPapelDocNix('personalizado')
                            if (e.target.checked) setSelectedAtribuicoes(prev => [...prev, a.id])
                            else setSelectedAtribuicoes(prev => prev.filter(id => id !== a.id))
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-800">{a.nome}</span>
                        {a.modulo && (
                          <span className="ml-auto text-xs text-gray-400 shrink-0">({a.modulo})</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </details>
            )}
          </div>
        ) : (
          /* DocNix sem módulo */
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Ações</p>
            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
              <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                {atribuicoesAtivas.map(a => (
                  <label key={a.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox"
                      checked={selectedAtribuicoes.includes(a.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedAtribuicoes(prev => [...prev, a.id])
                        else setSelectedAtribuicoes(prev => prev.filter(id => id !== a.id))
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-800">{a.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Busca */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Usuário ou grupo</p>
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {sugestoes.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {sugestoes.map(item => (
                  <button key={`${item.tipo}-${item.id}`} onClick={() => select(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">
                    <Avatar nome={item.nome} isGroup={item.tipo === 'group'} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                      <p className="text-xs text-gray-500 truncate">{item.sub}</p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                      item.tipo === 'group' ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-500'
                    )}>
                      {item.tipo === 'group' ? 'grupo' : 'usuário'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {search.trim().length > 0 && sugestoes.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 px-4 py-3">
                <p className="text-sm text-gray-500">Nenhum resultado encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export function InstanciaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [instancia,   setInstancia]   = useState<Instancia | null>(null)
  const [componente,  setComponente]  = useState<ComponenteInfo | null>(null)
  const [membros,     setMembros]     = useState<InstanciaMembro[]>([])
  const [allUsers,    setAllUsers]    = useState<User[]>([])
  const [allGrupos,   setAllGrupos]   = useState<Grupo[]>([])
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [addingId,        setAddingId]        = useState<string | null>(null)
  const [removingId,      setRemovingId]      = useState<string | null>(null)
  const [restringirAcesso, setRestringirAcesso] = useState(false)
  const [showPermissoes,  setShowPermissoes]  = useState(false)
  const [membroPermissoes, setMembroPermissoes] = useState<InstanciaMembro | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    api.getInstancia(id)
      .then(async (inst) => {
        setInstancia(inst)
        setRestringirAcesso(inst.restringirAcesso ?? false)

        const [comp, mems, users, grupos, attrs] = await Promise.all([
          api.getComponente(inst.componenteId),
          api.getInstanciaMembros(inst.id),
          api.getUsers(),
          api.getGrupos({ accountId: inst.accountId }),
          api.getAtribuicoes(inst.componenteId),
        ])

        setComponente({ id: comp.id, nome: comp.nome, tipoModelo: comp.tipoModelo ?? 'fga' })
        setMembros(mems)
        setAllUsers(users)
        setAllGrupos(grupos)
        setAtribuicoes(attrs)
      })
      .catch(() => {
        // fallback mock
        const instMock = { id: id!, componenteId: '', accountId: 'acc-comgas', nome: 'Instância', status: 'Ativo' as const, createdAt: '' }
        setInstancia(instMock)
        setMembros(mockInstMembros.filter(m => m.instanciaId === id))
        const contaIds = accountMembrosIds['acc-comgas'] ?? []
        setAllUsers(mockUsers.filter(u => contaIds.includes(u.id)))
        setAllGrupos(mockGrupos)
      })
      .finally(() => setLoading(false))
  }, [id])

  const isDocNix = componente?.tipoModelo === 'docnix'
  const modulo = componente?.nome ?? null  // 'MaxDoc' | 'DocAction' | etc.

  async function handleSavePapel(membro: InstanciaMembro, novoPapel: string) {
    // Optimistic update
    setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, papel: novoPapel as InstanciaMembro['papel'] } : m))
    try {
      // 1. Salvar o rótulo do papel
      await api.updateInstanciaMembro(instancia!.id, membro.id, novoPapel)

      // 2. Para DocNix: sincronizar instancia_membro_atribuicoes com o papel escolhido
      if (isDocNix) {
        const papelInfo = mockDocNixPapeis.find(p => p.value === novoPapel)
        if (papelInfo) {
          const atribuicoesAtivas = atribuicoes.filter(a => a.status === 'Ativo')
          const novasIds = papelInfo.atribuicaoNomes.length === 0
            ? atribuicoesAtivas.map(a => a.id)
            : atribuicoesAtivas.filter(a => papelInfo.atribuicaoNomes.includes(a.nome)).map(a => a.id)

          const atuais = await api.getMembroAtribuicoes(instancia!.id, membro.id)
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

  async function handleAdd(tipo: 'user' | 'group', entidadeId: string, nome: string, papel: string) {
    if (!instancia) return
    const tempId = `tmp-${Date.now()}`
    setAddingId(tempId)
    try {
      const novo = await api.addInstanciaMembro(instancia.id, { entidadeTipo: tipo, entidadeId, papel })
      setMembros(prev => [...prev, { ...novo, displayName: nome }])
    } finally {
      setAddingId(null)
    }
  }

  async function handleRemove(membro: InstanciaMembro) {
    if (!instancia) return
    if (!confirm(`Remover ${membro.displayName ?? membro.entidadeId} desta instância?`)) return
    setRemovingId(membro.id)
    try {
      await api.removeInstanciaMembro(instancia.id, membro.id)
      setMembros(prev => prev.filter(m => m.id !== membro.id))
    } catch {
      alert(`Não foi possível remover ${membro.displayName ?? membro.entidadeId}. Tente novamente.`)
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!instancia) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Instância não encontrada.</p>
      </div>
    )
  }

  const tipoLabel = componente?.nome ?? instancia.componenteId.replace('comp-', '')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb / back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="default" className="bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                  {tipoLabel}
                </Badge>
                <Badge variant={instancia.status === 'Ativo' ? 'success' : 'secondary'}>
                  {instancia.status}
                </Badge>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{instancia.nome}</h1>
              {instancia.descricao && (
                <p className="text-sm text-gray-500 mt-0.5">{instancia.descricao}</p>
              )}
            </div>

            {/* Toggle restringir acesso */}
            <div className="flex items-center gap-3 shrink-0 pt-1">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-700">Restringir acesso</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {restringirAcesso ? 'Somente membros' : 'Conta inteira'}
                </p>
              </div>
              <button
                onClick={async () => {
                  const novo = !restringirAcesso
                  setRestringirAcesso(novo)
                  try {
                    await fetch(`/api/instancias/${instancia.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ restringirAcesso: novo }),
                    })
                  } catch {
                    setRestringirAcesso(!novo)
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  restringirAcesso ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  restringirAcesso ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body: 2 colunas ─────────────────────────────────── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 flex gap-6 items-start">

        {/* ── Coluna esquerda: lista de membros ────────────── */}
        <div className="flex-1 min-w-0">
          {/* Subheader membros */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Membros
              <span className="ml-2 text-sm font-normal text-gray-400">({membros.length})</span>
            </h2>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar membro
            </button>
          </div>

          {membros.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-12 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nenhum membro atribuído ainda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Membro</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Papel</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {membros.map(membro => {
                    const isGroup    = membro.entidadeTipo === 'group'
                    const nome       = membro.displayName ?? membro.entidadeId
                    const isRemoving = removingId === membro.id

                    return (
                      <tr key={membro.id} className="hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0">
                        {/* Nome */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar nome={nome} isGroup={isGroup} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{nome}</p>
                              {membro.email && (
                                <p className="text-xs text-gray-500 truncate">{membro.email}</p>
                              )}
                              {isGroup && (
                                <p className="text-xs text-violet-500 font-medium">Grupo</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Papel */}
                        <td className="px-5 py-4">
                          {isDocNix ? (
                            <PapelEditorDocNix
                              papel={membro.papel}
                              modulo={modulo}
                              onSave={novo => handleSavePapel(membro, novo)}
                            />
                          ) : (
                            <PapelEditorFGA
                              papel={membro.papel}
                              onSave={novo => handleSavePapel(membro, novo)}
                            />
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setMembroPermissoes(membro); setShowPermissoes(true) }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Ver permissões"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              Ações
                            </button>
                            <button
                              onClick={() => handleRemove(membro)}
                              disabled={isRemoving || !!addingId}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Remover membro"
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
            </div>
          )}
        </div>

        {/* ── Coluna direita: painel de adição ─────────────── */}
        {showAdd && (
          <div className="w-96 shrink-0 bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6">
            <AddMembroPanel
              allUsers={allUsers}
              allGrupos={allGrupos}
              membros={membros}
              atribuicoes={atribuicoes}
              isDocNix={isDocNix}
              modulo={modulo}
              onAdd={handleAdd}
              onClose={() => setShowAdd(false)}
            />
          </div>
        )}
      </div>

      {/* ── Sheet de Permissões ──────────────────────────── */}
      {membroPermissoes && componente && (
        <PermissoesMembroSheet
          open={showPermissoes}
          onClose={() => { setShowPermissoes(false); setMembroPermissoes(null) }}
          instanciaId={instancia.id}
          instanciaNome={instancia.nome}
          componenteId={componente.id}
          componenteNome={componente.nome}
          componenteTipoModelo={componente.tipoModelo}
          membro={membroPermissoes}
          accountId={instancia.accountId}
          onSaved={async () => {
            setShowPermissoes(false)
            setMembroPermissoes(null)
            // Recarregar membros para refletir mudança de papel salva no sheet
            if (instancia) {
              const mems = await api.getInstanciaMembros(instancia.id).catch(() => null)
              if (mems) setMembros(mems)
            }
          }}
        />
      )}
    </div>
  )
}
