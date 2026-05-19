import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Plus, Ellipsis, FilePen, UserX, Eye, Trash2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Popover } from '@/components/ui/Popover'
import { UsuarioDetailAccountSheet } from '@/components/usuarios/UsuarioDetailAccountSheet'
import { EditUserSheet } from '@/components/EditUserSheet'
import { ConvidarUsuarioSheet } from '@/components/usuarios/ConvidarUsuarioSheet'
import { CriarUsuarioSheet } from '@/components/usuarios/CriarUsuarioSheet'
import { api } from '@/api/client'
import { useAdminAccountId, useIsPlatformAdmin, useIsOrgAdmin, useIsAccountAdmin } from '@/authz/hooks'
import { cn } from '@/lib/utils'
import type { User, Grupo } from '@/types'

import { CriarGrupoSheet } from '@/components/grupos/CriarGrupoSheet'
import { GrupoDetailSheet } from '@/components/grupos/GrupoDetailSheet'

type Aba = 'usuarios' | 'grupos'

// PoC: orgId fixo — em produção viria de account.orgId
const ORG_ID_POC = '1'

// ── Avatar com iniciais ───────────────────────────────────────

function Initials({ nome }: { nome: string }) {
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-[#e5e7eb] shrink-0 flex items-center justify-center text-xs font-semibold text-[#6b7280] select-none">
      {ini}
    </div>
  )
}

// ── Badge de escopo ───────────────────────────────────────────

function EscopoBadge({ escopo }: { escopo: 'org' | 'conta' }) {
  return escopo === 'org'
    ? <Badge variant="info">Organização</Badge>
    : <Badge variant="default" className="bg-violet-50 text-violet-700 border border-violet-200">Conta</Badge>
}

// ── Badge de papel ────────────────────────────────────────────

function PapelBadge({ papel }: { papel?: string }) {
  if (!papel) return <span className="text-xs text-gray-400">—</span>
  const variants: Record<string, string> = {
    'Viewer': 'bg-gray-100 text-gray-600 border-gray-200',
    'User':   'bg-blue-50 text-blue-700 border-blue-200',
    'Admin':  'bg-orange-50 text-orange-700 border-orange-200',
  }
  const cls = variants[papel] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {papel}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────

export function AcessosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const abaParam = searchParams.get('aba') as Aba | null
  const abaAtiva: Aba = abaParam === 'grupos' ? 'grupos' : 'usuarios'

  const rawAccountId    = useAdminAccountId()          // null quando a persona não é Account Admin
  const accountId       = rawAccountId ?? ''            // string vazia → sem conta resolvida
  const isPlatformAdmin = useIsPlatformAdmin()
  const isOrgAdmin      = useIsOrgAdmin()
  const isAccountAdmin  = useIsAccountAdmin()

  // Nome da conta — carregado para exibir o contexto da conta no header
  const [accountNome, setAccountNome] = useState<string | null>(null)
  useEffect(() => {
    if (!accountId) return
    api.getAccount(accountId)
      .then((acc: any) => setAccountNome(acc?.name ?? null))
      .catch(() => setAccountNome(null))
  }, [accountId])

  function setAba(aba: Aba) {
    setSearchParams({ aba }, { replace: true })
  }

  // ── Usuários ────────────────────────────────────────────────
  const [users, setUsers]                   = useState<User[]>([])
  const [loadingUsers, setLoadingUsers]     = useState(true)
  const [searchUsers, setSearchUsers]       = useState('')
  const [showConvidarSheet, setShowConvidarSheet] = useState(false)
  const [showCriarSheet, setShowCriarSheet]       = useState(false)
  const [showDetailSheet, setShowDetailSheet]     = useState(false)
  const [showEditSheet, setShowEditSheet]         = useState(false)
  const [selectedUser, setSelectedUser]           = useState<User | null>(null)

  useEffect(() => {
    api.getUsers()
      .then(data => { setUsers(data); setLoadingUsers(false) })
      .catch(() => setLoadingUsers(false))
  }, [])

  const filteredUsers = useMemo(() => {
    const q = searchUsers.toLowerCase()
    return users.filter(u =>
      u.nomeCompleto.toLowerCase().includes(q) ||
      u.usuario.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  }, [users, searchUsers])

  function handleConvidarSuccess(user: User) {
    setUsers(prev => prev.find(u => u.id === user.id) ? prev : [...prev, user])
  }

  function handleCriarSuccess(user: User) {
    setUsers(prev => prev.find(u => u.id === user.id) ? prev : [...prev, user])
  }

  function handleViewUser(user: User) {
    setSelectedUser(user)
    setShowDetailSheet(true)
  }

  const pendingEditUser = useRef<User | null>(null)
  const handleEditUser = useCallback((user: User) => {
    pendingEditUser.current = user
    setShowDetailSheet(false)
    setTimeout(() => {
      setSelectedUser(pendingEditUser.current)
      setShowEditSheet(true)
      pendingEditUser.current = null
    }, 340)
  }, [])

  async function handleSaveEditUser(updatedUser: User) {
    try {
      const saved = await api.updateUser(updatedUser.id, updatedUser)
      setUsers(p => p.map(u => u.id === saved.id ? saved : u))
      setSelectedUser(saved)
    } catch {
      setUsers(p => p.map(u => u.id === updatedUser.id ? updatedUser : u))
      setSelectedUser(updatedUser)
    }
    setShowEditSheet(false)
  }

  async function handleInactivateUser(user: User) {
    const inativado: User = { ...user, status: 'Inativo' }
    try {
      const saved = await api.updateUser(user.id, inativado)
      setUsers(p => p.map(u => u.id === saved.id ? saved : u))
    } catch {
      setUsers(p => p.map(u => u.id === user.id ? inativado : u))
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return
    try { await api.deleteUser(selectedUser.id) } catch { /* silencioso */ }
    setUsers(p => p.filter(u => u.id !== selectedUser.id))
    setShowEditSheet(false)
    setSelectedUser(null)
  }

  // ── Grupos ──────────────────────────────────────────────────
  const [grupos, setGrupos]               = useState<Grupo[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(true)
  const [searchGrupos, setSearchGrupos]   = useState('')
  const [showCriarGrupoSheet, setShowCriarGrupoSheet]       = useState(false)
  const [showGrupoDetailSheet, setShowGrupoDetailSheet]     = useState(false)
  const [selectedGrupo, setSelectedGrupo]                   = useState<Grupo | null>(null)

  useEffect(() => {
    api.getGrupos({ orgId: ORG_ID_POC, accountId })
      .then(data => { setGrupos(data); setLoadingGrupos(false) })
      .catch(() => setLoadingGrupos(false))
  }, [accountId])

  const filteredGrupos = useMemo(() => {
    const q = searchGrupos.toLowerCase()
    return grupos.filter(g =>
      g.nome.toLowerCase().includes(q) ||
      (g.descricao ?? '').toLowerCase().includes(q)
    )
  }, [grupos, searchGrupos])

  function handleViewGrupo(grupo: Grupo) {
    setSelectedGrupo(grupo)
    setShowGrupoDetailSheet(true)
  }

  async function handleDeleteGrupo(grupo: Grupo) {
    if (!confirm(`Excluir o grupo "${grupo.nome}"? Esta ação não pode ser desfeita.`)) return
    try { await api.deleteGrupo(grupo.id) } catch { /* silencioso */ }
    setGrupos(p => p.filter(g => g.id !== grupo.id))
  }

  // ── Search unificado ────────────────────────────────────────
  const searchQuery = abaAtiva === 'usuarios' ? searchUsers : searchGrupos
  function handleSearchChange(v: string) {
    if (abaAtiva === 'usuarios') setSearchUsers(v)
    else setSearchGrupos(v)
  }

  // ── Render ──────────────────────────────────────────────────

  // Quando não há conta vinculada à persona atual (Platform Admin, PAS Architect…)
  if (!rawAccountId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-gray-400" />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-gray-800">Nenhuma conta vinculada</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {isPlatformAdmin || isOrgAdmin
              ? 'Você está como Platform Admin ou Org Admin. Esta página exibe acessos de uma conta específica — navegue até uma conta em Contas para acessá-la diretamente.'
              : 'Esta página está disponível apenas para Account Admins vinculados a uma conta.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between px-8 py-4 gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">Escopo: Conta</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">Account Admin</span>
            {accountNome && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
                Conta: <strong className="font-semibold">{accountNome}</strong>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-8 text-[#030712]">Acessos e usuários</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Gerencie quem acessa <strong className="font-medium text-[#374151]">esta conta</strong> e com quais permissões.
            Diferente de <strong className="font-medium text-[#374151]">Usuários</strong> (visão da organização), aqui você vê apenas os membros e grupos desta conta específica.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
            <Search className="w-4 h-4 text-gray-400 opacity-50" />
            <input
              type="text"
              placeholder="Buscar"
              className="w-28 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => handleSearchChange('')} className="text-gray-400 hover:text-gray-600 leading-none">×</button>
            )}
          </div>
          {abaAtiva === 'usuarios' ? (
            <div className="flex items-center gap-2">
              {(isPlatformAdmin || isOrgAdmin) && (
                <button
                  onClick={() => setShowCriarSheet(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-gray-200 bg-white text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar usuário
                  <span className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 leading-none">Dev</span>
                </button>
              )}
              <Button onClick={() => setShowConvidarSheet(true)}>
                <Plus className="w-4 h-4 mr-1.5" />Convidar usuário
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowCriarGrupoSheet(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Criar grupo
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-gray-200">
        <div className="flex">
          {(['usuarios', 'grupos'] as const).map(aba => (
            <button
              key={aba}
              onClick={() => setAba(aba)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                abaAtiva === aba
                  ? 'border-[#030712] text-[#030712]'
                  : 'border-transparent text-[#6b7280] hover:text-[#030712] hover:border-gray-300'
              )}
            >
              {aba === 'usuarios' ? 'Usuários' : 'Grupos'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Aba Usuários ── */}
      {abaAtiva === 'usuarios' && (
        <div className="px-8 pt-6 pb-8">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[200px]">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[150px]">Usuário</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[200px]">E-mail</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[150px]">Função</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 min-w-[120px]">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[120px]">Último acesso</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td></tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <tr
                      key={user.id}
                      className="group border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer last:border-b-0"
                      onClick={() => handleViewUser(user)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Initials nome={user.nomeCompleto} />
                          <span className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#030712]">{user.usuario}</td>
                      <td className="px-4 py-3 text-sm text-[#030712]">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-[#030712]">{user.papel}</td>
                      <td className="px-4 py-3 text-center">
                        {user.status === 'Ativo'
                          ? <Badge variant="success" showIcon>Ativo</Badge>
                          : <Badge variant="secondary" showIcon>{user.status}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#030712]">{user.ultimoAcesso}</td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="invisible group-hover:visible">
                          <Popover
                            content={
                              <div className="flex flex-col gap-1 min-w-[163px]">
                                <button onClick={() => handleEditUser(user)} className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left">
                                  <FilePen className="w-4 h-4 shrink-0" />Editar usuário
                                </button>
                                <button onClick={() => handleInactivateUser(user)} className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left">
                                  <UserX className="w-4 h-4 shrink-0" />Inativar usuário
                                </button>
                              </div>
                            }
                          >
                            <button className="p-2 hover:bg-gray-100 rounded-md transition-colors" title="Ações">
                              <Ellipsis className="w-4 h-4 text-gray-600" />
                            </button>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Nenhum usuário encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Aba Grupos ── */}
      {abaAtiva === 'grupos' && (
        <div className="px-8 pt-6 pb-8">
          <p className="text-sm text-[#6b7280] mb-4">
            Grupos com escopo <strong>Organização</strong> são criados pelo Org Admin e herdados por todas as contas — você pode atribuir permissões a eles, mas não editá-los aqui.
            Grupos com escopo <strong>Conta</strong> são exclusivos desta conta e gerenciados pelo Account Admin.
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[240px]">Grupo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[100px]">Membros</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[110px]">Papel</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[130px]">Escopo</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[100px]">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingGrupos ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td></tr>
                ) : filteredGrupos.length > 0 ? (
                  filteredGrupos.map(grupo => (
                    <tr
                      key={grupo.id}
                      className="group border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer last:border-b-0"
                      onClick={() => handleViewGrupo(grupo)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#030712]">{grupo.nome}</p>
                        {grupo.descricao && (
                          <p className="text-xs text-[#6b7280] mt-0.5 max-w-xs truncate">{grupo.descricao}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#030712]">{grupo.qtdMembros ?? 0}</td>
                      <td className="px-4 py-3"><PapelBadge papel={grupo.papel} /></td>
                      <td className="px-4 py-3"><EscopoBadge escopo={grupo.escopo} /></td>
                      <td className="px-4 py-3 text-center">
                        {grupo.status === 'Ativo'
                          ? <Badge variant="success">Ativo</Badge>
                          : <Badge variant="secondary">Inativo</Badge>}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="invisible group-hover:visible">
                          <Popover
                            content={
                              <div className="flex flex-col gap-1 min-w-[160px]">
                                <button onClick={() => handleViewGrupo(grupo)} className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left">
                                  <Eye className="w-4 h-4 shrink-0" />Ver detalhes
                                </button>
                                {grupo.escopo === 'conta' && (
                                  <button onClick={() => handleDeleteGrupo(grupo)} className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors text-left">
                                    <Trash2 className="w-4 h-4 shrink-0" />Excluir grupo
                                  </button>
                                )}
                              </div>
                            }
                          >
                            <button className="p-2 hover:bg-gray-100 rounded-md transition-colors" title="Ações">
                              <Ellipsis className="w-4 h-4 text-gray-600" />
                            </button>
                          </Popover>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-sm font-medium text-[#030712]">Nenhum grupo encontrado</p>
                      <p className="text-xs text-[#6b7280] mt-1">Crie um grupo para organizar os usuários desta conta.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sheets — Usuários */}
      <CriarUsuarioSheet
        open={showCriarSheet}
        onClose={() => setShowCriarSheet(false)}
        onSuccess={handleCriarSuccess}
      />
      <ConvidarUsuarioSheet
        open={showConvidarSheet}
        onClose={() => setShowConvidarSheet(false)}
        accountId={accountId}
        onSuccess={handleConvidarSuccess}
      />
      <UsuarioDetailAccountSheet
        open={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        user={selectedUser}
        accountId={accountId}
        onEdit={handleEditUser}
      />
      <EditUserSheet
        open={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        user={selectedUser}
        onSave={handleSaveEditUser}
        onDelete={handleDeleteUser}
      />

      {/* Sheets — Grupos */}
      <CriarGrupoSheet
        open={showCriarGrupoSheet}
        onClose={() => setShowCriarGrupoSheet(false)}
        accountId={accountId}
        onSuccess={grupo => setGrupos(prev => [...prev, grupo])}
      />
      <GrupoDetailSheet
        open={showGrupoDetailSheet}
        onClose={() => setShowGrupoDetailSheet(false)}
        grupo={selectedGrupo}
        accountId={accountId}
      />
    </div>
  )
}
