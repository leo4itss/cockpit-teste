import { useState, useEffect, useCallback } from 'react'
import { BadgeCheck, Circle, Plus, Trash2, UserMinus, Link } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { Select } from './ui/Select'
import { Input } from './ui/Input'
import { VincularObjetosDialog } from './VincularObjetosDialog'
import { api } from '@/api/client'
import type { Grupo, User, GrupoPermissao } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  grupo: Grupo | null
  onUpdate: (grupo: Grupo) => void
  onDelete: (id: string) => void
}

type Tab = 'membros' | 'objetos'

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
]

export function GrupoDetailSheet({ open, onClose, grupo, onUpdate, onDelete }: Props) {
  const [tab, setTab] = useState<Tab>('membros')
  const [editing, setEditing] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [saving, setSaving] = useState(false)

  const [membros, setMembros] = useState<User[]>([])
  const [loadingMembros, setLoadingMembros] = useState(false)
  const [todosUsuarios, setTodosUsuarios] = useState<User[]>([])
  const [addingUser, setAddingUser] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  const [permissoes, setPermissoes] = useState<GrupoPermissao[]>([])
  const [loadingPermissoes, setLoadingPermissoes] = useState(false)
  const [showVincularDialog, setShowVincularDialog] = useState(false)

  const loadMembros = useCallback(async (grupoId: string) => {
    setLoadingMembros(true)
    const data = await api.getMembrosGrupo(grupoId)
    setMembros(data)
    setLoadingMembros(false)
  }, [])

  const loadPermissoes = useCallback(async (grupoId: string) => {
    setLoadingPermissoes(true)
    const data = await api.getPermissoesGrupo(grupoId)
    setPermissoes(data)
    setLoadingPermissoes(false)
  }, [])

  useEffect(() => {
    if (open && grupo) {
      setNome(grupo.nome)
      setDescricao(grupo.descricao ?? '')
      setStatus(grupo.status)
      setEditing(false)
      setTab('membros')
      setAddingUser(false)
      setUserSearch('')
      loadMembros(grupo.id)
      loadPermissoes(grupo.id)
    }
  }, [open, grupo, loadMembros, loadPermissoes])

  useEffect(() => {
    if (addingUser) {
      api.getUsers().then(setTodosUsuarios)
    }
  }, [addingUser])

  if (!grupo) return null

  async function handleSave() {
    if (!grupo || !nome.trim()) return
    setSaving(true)
    const updated = await api.updateGrupo(grupo.id, {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      status,
    })
    onUpdate({ ...grupo, ...updated })
    setEditing(false)
    setSaving(false)
  }

  function handleCancelEdit() {
    setNome(grupo.nome)
    setDescricao(grupo.descricao ?? '')
    setStatus(grupo.status)
    setEditing(false)
  }

  async function handleAddMembro(userId: string) {
    if (!grupo) return
    await api.addMembroGrupo(grupo.id, userId)
    await loadMembros(grupo.id)
    onUpdate({ ...grupo, qtdMembros: (grupo.qtdMembros ?? 0) + 1 })
    setAddingUser(false)
    setUserSearch('')
  }

  async function handleRemoveMembro(userId: string) {
    if (!grupo) return
    await api.removeMembroGrupo(grupo.id, userId)
    setMembros(prev => prev.filter(m => m.id !== userId))
    onUpdate({ ...grupo, qtdMembros: Math.max(0, (grupo.qtdMembros ?? 1) - 1) })
  }

  async function handleRemoverPermissao(permissaoId: string) {
    if (!grupo) return
    await api.removerPermissaoGrupo(grupo.id, permissaoId)
    setPermissoes(prev => prev.filter(p => p.id !== permissaoId))
  }

  async function handlePermissoesSalvas() {
    if (grupo) await loadPermissoes(grupo.id)
  }

  const usuariosDisponiveis = todosUsuarios.filter(
    u => !membros.some(m => m.id === u.id) &&
      (u.nomeCompleto.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()))
  )

  return (
    <>
      <Sheet open={open} onClose={onClose} title={grupo.nome} width="w-[860px]">
        {/* Info do grupo + edição */}
        <div className="flex flex-col gap-4 pb-6 border-b border-gray-200">
          {editing ? (
            <div className="flex flex-col gap-4">
              <Input label="Nome do grupo" required value={nome} onChange={e => setNome(e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#030712]">Descrição</label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-gray-300 resize-none placeholder:text-gray-400"
                />
              </div>
              <Select
                label="Status"
                value={status}
                onChange={v => setStatus(v as 'Ativo' | 'Inativo')}
                options={STATUS_OPTIONS}
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving || !nome.trim()}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                {grupo.descricao && (
                  <p className="text-sm text-gray-500">{grupo.descricao}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {grupo.status === 'Ativo' ? (
                    <span className="inline-flex items-center gap-1 bg-green-200 text-green-700 text-xs font-semibold rounded-[2px] px-2 py-1">
                      <BadgeCheck className="w-3 h-3" />Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-[2px] px-2 py-1">
                      <Circle className="w-3 h-3" />Inativo
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{grupo.qtdMembros ?? membros.length} membro{(grupo.qtdMembros ?? membros.length) !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { if (confirm(`Excluir o grupo "${grupo.nome}"?`)) onDelete(grupo.id) }}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 mt-6">
          {(['membros', 'objetos'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-[#030712] text-[#030712]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'membros' ? 'Membros' : 'Objetos'}
            </button>
          ))}
        </div>

        {/* Aba Membros */}
        {tab === 'membros' && (
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Usuários que fazem parte deste grupo.</p>
              <Button size="sm" variant="outline" onClick={() => setAddingUser(v => !v)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar membro
              </Button>
            </div>

            {/* Painel de adição de membro */}
            {addingUser && (
              <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 bg-gray-50">
                <p className="text-sm font-medium text-[#030712]">Selecionar usuário</p>
                <input
                  type="text"
                  placeholder="Buscar por nome ou e-mail..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-400 bg-white"
                  autoFocus
                />
                <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                  {usuariosDisponiveis.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-gray-400 text-center">
                      {todosUsuarios.length === 0 ? 'Carregando...' : 'Nenhum usuário disponível'}
                    </p>
                  ) : (
                    usuariosDisponiveis.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleAddMembro(u.id)}
                        className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-[#030712] truncate">{u.nomeCompleto}</span>
                          <span className="text-xs text-gray-500 truncate">{u.email}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setAddingUser(false); setUserSearch('') }}>
                  Cancelar
                </Button>
              </div>
            )}

            {/* Tabela de membros */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40">Nome</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40">E-mail</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Remover</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMembros ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">Carregando...</td></tr>
                  ) : membros.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">Nenhum membro neste grupo</td></tr>
                  ) : (
                    membros.map(m => (
                      <tr key={m.id} className="border-b border-gray-200 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                            <span className="text-sm font-medium text-[#030712]">{m.nomeCompleto}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{m.email}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveMembro(m.id)}
                            className="p-1.5 hover:bg-red-50 rounded-md text-red-400 hover:text-red-600 transition-colors"
                            title="Remover membro"
                          >
                            <UserMinus className="w-4 h-4" />
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

        {/* Aba Objetos */}
        {tab === 'objetos' && (
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Objetos vinculados a este grupo e suas permissões.</p>
              <Button size="sm" variant="outline" onClick={() => setShowVincularDialog(true)}>
                <Link className="w-3.5 h-3.5 mr-1" />
                Vincular objetos
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40">Componente / Objeto</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40">Permissões ativas</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPermissoes ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-400">Carregando...</td></tr>
                  ) : permissoes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                        Nenhum objeto vinculado.<br />
                        <span className="text-xs">Clique em "Vincular objetos" para configurar permissões.</span>
                      </td>
                    </tr>
                  ) : (
                    permissoes.map(p => (
                      <tr key={p.id} className="border-b border-gray-200 last:border-0">
                        <td className="px-4 py-3 text-sm font-medium text-[#030712]">
                          {p.objeto?.nome ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.permissoesAtivas as string[]).length === 0 ? (
                              <span className="text-xs text-gray-400">Nenhuma permissão</span>
                            ) : (
                              (p.permissoesAtivas as string[]).map(permId => {
                                const label = p.objeto?.permissoesDisponiveis?.find(pd => pd.id === permId)?.nome ?? permId
                                return (
                                  <span key={permId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                    {label}
                                  </span>
                                )
                              })
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoverPermissao(p.id)}
                            className="p-1.5 hover:bg-red-50 rounded-md text-red-400 hover:text-red-600 transition-colors"
                            title="Remover vínculo"
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
      </Sheet>

      <VincularObjetosDialog
        open={showVincularDialog}
        onClose={() => setShowVincularDialog(false)}
        grupoId={grupo.id}
        permissoesExistentes={permissoes}
        onSave={handlePermissoesSalvas}
      />
    </>
  )
}
