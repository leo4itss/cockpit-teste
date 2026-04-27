import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BadgeCheck, Check, Pencil, Link, Trash2, X, Eye, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { VincularMembroDialog } from '@/components/VincularMembroDialog'
import { VincularObjetosDialog } from '@/components/VincularObjetosDialog'
import { api } from '@/api/client'
import type { Grupo, User, GrupoPermissao } from '@/types'

type Tab = 'membros' | 'objetos'

// ── Mapeamento de roles FGA → visual + descrição ──────────────────────────
// Cada role representa uma relação do modelo FGA para type component:
//   viewer  → can_view
//   editor  → can_edit + can_view
//   manager → can_manage + can_edit + can_view
const FGA_ROLE_META: Record<string, {
  label: string
  icon: React.ReactNode
  badge: string
  unlocks: string[]
}> = {
  viewer: {
    label: 'Viewer',
    icon: <Eye className="w-3 h-3" />,
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    unlocks: ['can_view'],
  },
  editor: {
    label: 'Editor',
    icon: <Pencil className="w-3 h-3" />,
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    unlocks: ['can_view', 'can_edit'],
  },
  manager: {
    label: 'Manager',
    icon: <Settings className="w-3 h-3" />,
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    unlocks: ['can_view', 'can_edit', 'can_manage'],
  },
}

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
]

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [loadingGrupo, setLoadingGrupo] = useState(true)

  const [tab, setTab] = useState<Tab>('membros')
  const [editing, setEditing] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editStatus, setEditStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [saving, setSaving] = useState(false)

  const [membros, setMembros] = useState<User[]>([])
  const [loadingMembros, setLoadingMembros] = useState(false)
  const [showVincularMembro, setShowVincularMembro] = useState(false)

  const [permissoes, setPermissoes] = useState<GrupoPermissao[]>([])
  const [loadingPermissoes, setLoadingPermissoes] = useState(false)
  const [showVincularObjetos, setShowVincularObjetos] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoadingGrupo(true)
    api.getGrupo(id)
      .then((data: Grupo) => {
        setGrupo(data)
        setEditNome(data.nome)
        setEditDescricao(data.descricao ?? '')
        setEditStatus(data.status)
      })
      .catch(() => navigate('/grupos'))
      .finally(() => setLoadingGrupo(false))
  }, [id, navigate])

  const loadMembros = useCallback(async () => {
    if (!id) return
    setLoadingMembros(true)
    const data = await api.getMembrosGrupo(id)
    setMembros(data)
    setLoadingMembros(false)
  }, [id])

  const loadPermissoes = useCallback(async () => {
    if (!id) return
    setLoadingPermissoes(true)
    const data = await api.getPermissoesGrupo(id)
    setPermissoes(data)
    setLoadingPermissoes(false)
  }, [id])

  useEffect(() => {
    loadMembros()
    loadPermissoes()
  }, [loadMembros, loadPermissoes])

  async function handleSave() {
    if (!grupo || !editNome.trim()) return
    setSaving(true)
    const updated = await api.updateGrupo(grupo.id, {
      nome: editNome.trim(),
      descricao: editDescricao.trim() || null,
      status: editStatus,
    })
    setGrupo({ ...grupo, ...updated })
    setEditing(false)
    setSaving(false)
  }

  function handleCancelEdit() {
    if (!grupo) return
    setEditNome(grupo.nome)
    setEditDescricao(grupo.descricao ?? '')
    setEditStatus(grupo.status)
    setEditing(false)
  }

  async function handleVincularMembros(userIds: string[]) {
    if (!grupo) return
    await Promise.all(userIds.map(uid => api.addMembroGrupo(grupo.id, uid)))
    await loadMembros()
    setGrupo(g => g ? { ...g, qtdMembros: (g.qtdMembros ?? 0) + userIds.length } : g)
  }

  async function handleRemoverMembro(userId: string) {
    if (!grupo) return
    await api.removeMembroGrupo(grupo.id, userId)
    setMembros(prev => prev.filter(m => m.id !== userId))
    setGrupo(g => g ? { ...g, qtdMembros: Math.max(0, (g.qtdMembros ?? 1) - 1) } : g)
  }

  async function handleRemoverPermissao(permId: string) {
    if (!grupo) return
    await api.removerPermissaoGrupo(grupo.id, permId)
    setPermissoes(prev => prev.filter(p => p.id !== permId))
  }

  async function handlePermissoesSalvas() {
    await loadPermissoes()
  }

  async function handleDeleteGrupo() {
    if (!grupo) return
    if (!confirm(`Excluir o grupo "${grupo.nome}"?`)) return
    await api.deleteGrupo(grupo.id)
    navigate('/grupos')
  }

  if (loadingGrupo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    )
  }

  if (!grupo) return null

  const membrosAtivos = membros.filter(m => m.status === 'Ativo').length

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left panel */}
      <aside className="w-[280px] shrink-0 border-r border-gray-200 flex flex-col shadow-[0_4px_6px_-4px_rgba(0,0,0,0.1)]">
        {/* Group info card */}
        <div className="p-6 border-b border-gray-200 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-sm font-medium text-[#030712]">
              {initials(grupo.nome)}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={editNome}
                    onChange={e => setEditNome(e.target.value)}
                    placeholder="Nome do grupo"
                  />
                  <Select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as 'Ativo' | 'Inativo')}
                    options={STATUS_OPTIONS}
                  />
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" onClick={handleSave} disabled={saving || !editNome.trim()}>
                      {saving ? '...' : <Check className="w-3.5 h-3.5" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={saving}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-base font-bold text-[#030712] leading-5 truncate">{grupo.nome}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full bg-green-600 flex items-center justify-center">
                      <Check className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-xs font-medium text-green-600">
                      {grupo.status === 'Ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </>
              )}
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="shrink-0 h-7 px-2.5 text-xs font-medium text-[#030712] border border-gray-200 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Editar
              </button>
            )}
          </div>
        </div>

        {/* Stats and info */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-1">
          {/* Membros Ativos */}
          <div>
            <div className="flex items-center justify-between pb-3">
              <p className="text-base font-bold text-[#030712]">Membros Ativos</p>
              <p className="text-base font-medium text-[#030712]">{String(membrosAtivos).padStart(2, '0')}</p>
            </div>
            <div className="border-t border-gray-200" />
          </div>

          {/* Sobre o grupo */}
          <div>
            <div className="pb-3">
              {editing ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-base font-bold text-[#030712]">Sobre o grupo</label>
                  <textarea
                    value={editDescricao}
                    onChange={e => setEditDescricao(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-gray-300 resize-none placeholder:text-gray-400"
                    placeholder="Descrição do grupo..."
                  />
                </div>
              ) : (
                <>
                  <p className="text-base font-bold text-[#030712] pb-3">Sobre o grupo</p>
                  <p className="text-sm text-gray-500 leading-5">
                    {grupo.descricao || <span className="italic text-gray-300">Sem descrição</span>}
                  </p>
                </>
              )}
            </div>
            <div className="border-t border-gray-200 mt-3" />
          </div>

          {/* Administradores */}
          <div>
            <p className="text-base font-bold text-[#030712] pb-3">Administradores</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#030712]">Administrador</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">
                  Admin
                </span>
              </div>
              <p className="text-sm text-gray-400">grupoitss@grupoitss.com.br</p>
            </div>
          </div>

          {/* Excluir grupo */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <button
              onClick={handleDeleteGrupo}
              className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir grupo
            </button>
          </div>
        </div>
      </aside>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        <div className="border-b border-gray-200 px-8 flex items-center">
          {(['membros', 'objetos'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2.5 py-3.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px mr-1 ${
                tab === t
                  ? 'border-blue-600 text-[#030712] font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'membros' ? 'Membros' : 'Objetos'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-8">
          {tab === 'membros' && (
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#030712]">Membros</h2>
                  <p className="text-base text-gray-500 mt-2">
                    Gerencie os usuários que fazem parte deste grupo. Adicione membros para conceder acesso e permissões dentro do sistema.
                  </p>
                </div>
                <Button onClick={() => setShowVincularMembro(true)}>
                  Vincular membros
                </Button>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40">Membros</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40">E-mail</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40">Cargo</th>
                      <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40">Área</th>
                      <th className="px-3 py-2.5 text-center text-sm font-medium text-gray-600 opacity-40">Status</th>
                      <th className="px-3 py-2.5 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMembros ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
                    ) : membros.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum membro neste grupo</td></tr>
                    ) : (
                      membros.map(m => (
                        <tr key={m.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-[#030712] shrink-0">
                                {initials(m.nomeCompleto)}
                              </div>
                              <span className="text-sm font-medium text-[#030712] truncate">{m.nomeCompleto}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-600 truncate">{m.email}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">{m.cargo}</td>
                          <td className="px-3 py-3 text-sm text-gray-600">{m.area}</td>
                          <td className="px-3 py-3 text-center">
                            {m.status === 'Ativo' ? (
                              <span className="inline-flex items-center gap-1 bg-green-200 text-green-700 text-xs font-semibold rounded-[2px] px-2 py-1">
                                <BadgeCheck className="w-3 h-3" />
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-[2px] px-2 py-1">
                                Inativo
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleRemoverMembro(m.id)}
                              className="p-1.5 hover:bg-red-50 rounded-md text-red-400 hover:text-red-600 transition-colors"
                              title="Remover membro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'objetos' && (
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#030712]">Objetos</h2>
                  <p className="text-base text-gray-500 mt-2">
                    Configure as permissões de acesso para cada objeto dos componentes vinculados a este grupo.
                  </p>
                </div>
                <Button onClick={() => setShowVincularObjetos(true)}>
                  <Link className="w-4 h-4 mr-2" />
                  Vincular objetos
                </Button>
              </div>

              {/* Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Objeto</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role FGA</th>
                      <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Permite</th>
                      <th className="px-3 py-2.5 w-[60px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPermissoes ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
                    ) : permissoes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                          Nenhum objeto vinculado.{' '}
                          <button onClick={() => setShowVincularObjetos(true)} className="text-blue-600 hover:underline">
                            Vincular objetos
                          </button>
                        </td>
                      </tr>
                    ) : (
                      permissoes.map(p => {
                        // roleId é o role FGA ativo (viewer | editor | manager)
                        const roleId = (p.permissoesAtivas as string[])[0] ?? null
                        const meta = roleId ? FGA_ROLE_META[roleId] : null
                        return (
                          <tr key={p.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                            {/* Objeto */}
                            <td className="px-3 py-3">
                              <p className="text-sm font-medium text-[#030712]">{p.objeto?.nome ?? '—'}</p>
                              {p.objeto?.descricao && (
                                <p className="text-xs text-gray-400 mt-0.5">{p.objeto.descricao}</p>
                              )}
                            </td>
                            {/* Role badge */}
                            <td className="px-3 py-3">
                              {meta ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${meta.badge}`}>
                                  {meta.icon}
                                  {meta.label}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300 italic">—</span>
                              )}
                            </td>
                            {/* Permissões que o role habilita */}
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {meta ? meta.unlocks.map(p => (
                                  <span key={p} className="font-mono text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">
                                    {p}
                                  </span>
                                )) : null}
                              </div>
                            </td>
                            {/* Ação */}
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => handleRemoverPermissao(p.id)}
                                className="p-1.5 hover:bg-red-50 rounded-md text-gray-300 hover:text-red-500 transition-colors"
                                title="Remover vínculo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <VincularMembroDialog
        open={showVincularMembro}
        onClose={() => setShowVincularMembro(false)}
        onVincular={handleVincularMembros}
        membroIdsAtuais={membros.map(m => m.id)}
      />

      <VincularObjetosDialog
        open={showVincularObjetos}
        onClose={() => setShowVincularObjetos(false)}
        grupoId={grupo.id}
        permissoesExistentes={permissoes}
        onSave={handlePermissoesSalvas}
      />
    </div>
  )
}
