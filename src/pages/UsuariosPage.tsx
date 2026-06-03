import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Ellipsis, UserX, UserCheck, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Popover } from '@/components/ui/Popover'
import { CriarUsuarioSheet } from '@/components/usuarios/CriarUsuarioSheet'
import {
  UsuarioDetailOrgSheet,
  type ContaVinculada,
} from '@/components/usuarios/UsuarioDetailOrgSheet'
import { api } from '@/api/client'
import { useAuthz } from '@/authz/hooks'
import { cn } from '@/lib/utils'
import type { User, Account } from '@/types'
import {
  users     as mockUsers,
  accounts  as mockAccounts,
  grupos    as mockGrupos,
  accountMembrosIds,
  grupoMembrosMap,
} from '@/data/mock'

// ── Avatar colorido ───────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  { bg: 'bg-green-100',  text: 'text-green-700'  },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  { bg: 'bg-teal-100',   text: 'text-teal-700'   },
]
function getAvatarColor(nome: string) {
  const hash = nome.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
function Avatar({ nome }: { nome: string }) {
  const { bg, text } = getAvatarColor(nome)
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className={cn('w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold select-none', bg, text)}>
      {ini}
    </div>
  )
}

// ── Card de métrica ───────────────────────────────────────────

function MetricCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="flex-1 px-6 py-4 min-w-0">
      <p className="text-2xl font-bold text-[#030712] leading-8">
        {loading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : value}
      </p>
      <p className="text-xs text-[#6b7280] mt-0.5">{label}</p>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

export function UsuariosPage() {
  const { currentUser, relations } = useAuthz()
  const adminOrgId = relations.orgAdmins.find(a => a.userId === currentUser.id)?.orgId ?? '1'

  // ── Estado ────────────────────────────────────────────────
  const [users, setUsers]       = useState<User[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)

  // userId → contas vinculadas (com papel)
  const [userAccountsMap, setUserAccountsMap] =
    useState<Record<string, ContaVinculada[]>>({})

  // userId → qtd de grupos
  const [userGruposCount, setUserGruposCount] =
    useState<Record<string, number>>({})

  // Filtros
  const [search, setSearch]           = useState('')
  const [funcaoFilter, setFuncaoFilter] = useState('')

  // Sheets
  const [showCriar, setShowCriar]           = useState(false)
  const [showDetail, setShowDetail]         = useState(false)
  const [selectedUser, setSelectedUser]     = useState<User | null>(null)

  // ── Fetch ─────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)

    Promise.all([
      api.getUsers(),
      api.getAccounts(adminOrgId),
      api.getGrupos({ orgId: adminOrgId }),
    ]).then(async ([fetchedUsers, fetchedAccounts, fetchedGrupos]) => {
      setUsers(fetchedUsers)
      setAccounts(fetchedAccounts)

      // Membros por conta → userAccountsMap
      const accountMems = await Promise.all(
        fetchedAccounts.map(acc =>
          api.getAccountMembros(acc.id)
            .then((mems: any[]) => mems.map(m => ({ userId: m.id, account: acc, papel: m.papel as 'member' | 'account_admin' })))
            .catch(() => [] as { userId: string; account: Account; papel: 'member' | 'account_admin' }[])
        )
      )
      const accMap: Record<string, ContaVinculada[]> = {}
      accountMems.flat().forEach(({ userId, account, papel }) => {
        if (!accMap[userId]) accMap[userId] = []
        accMap[userId].push({ account, papel })
      })
      setUserAccountsMap(accMap)

      // Membros por grupo → userGruposCount
      const grupoMems = await Promise.all(
        fetchedGrupos.map(g =>
          api.getGrupoMembros(g.id)
            .then((mems: any[]) => mems.map((m: any) => m.id as string))
            .catch(() => [] as string[])
        )
      )
      const gMap: Record<string, number> = {}
      grupoMems.flat().forEach(uid => { gMap[uid] = (gMap[uid] ?? 0) + 1 })
      setUserGruposCount(gMap)

      setLoading(false)
    }).catch(() => {
      // Fallback mock para quando o Neon está hibernando
      const fallbackAccounts = mockAccounts.filter(a => a.orgId === adminOrgId)
      const memberIds = fallbackAccounts.flatMap(a => accountMembrosIds[a.id] ?? [])
      const fallbackUsers = mockUsers.filter(u => memberIds.includes(u.id))

      const accMap: Record<string, ContaVinculada[]> = {}
      fallbackAccounts.forEach(acc => {
        const ids = accountMembrosIds[acc.id] ?? []
        ids.forEach(uid => {
          if (!accMap[uid]) accMap[uid] = []
          accMap[uid].push({ account: acc, papel: 'member' })
        })
      })

      const fallbackGrupos = mockGrupos.filter(g =>
        fallbackAccounts.some(a => a.id === g.accountId) || g.orgId === adminOrgId
      )
      const gMap: Record<string, number> = {}
      fallbackGrupos.forEach(g => {
        ;(grupoMembrosMap[g.id] ?? []).forEach(uid => {
          gMap[uid] = (gMap[uid] ?? 0) + 1
        })
      })

      setUsers(fallbackUsers)
      setAccounts(fallbackAccounts)
      setUserAccountsMap(accMap)
      setUserGruposCount(gMap)
      setLoading(false)
    })
  }, [adminOrgId])

  // ── Derivados ─────────────────────────────────────────────

  const funcoes = useMemo(
    () => [...new Set(users.map(u => u.papel).filter(Boolean))].sort(),
    [users]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const matchSearch =
        !q ||
        u.nomeCompleto.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      const matchFuncao = !funcaoFilter || u.papel === funcaoFilter
      return matchSearch && matchFuncao
    })
  }, [users, search, funcaoFilter])

  // Métricas
  const qtdAtivos    = users.filter(u => u.status === 'Ativo').length
  const qtdAdmins    = relations.orgAdmins.filter(a => a.orgId === adminOrgId).length
  const metrics = [
    { label: 'Total de usuários',        value: users.length },
    { label: 'Usuários ativos',          value: qtdAtivos },
    { label: 'Contas gerenciadas',       value: accounts.length },
    { label: 'Administradores da org',   value: qtdAdmins },
  ]

  // ── Handlers ──────────────────────────────────────────────

  function handleCriarSuccess(user: User) {
    setUsers(prev => prev.find(u => u.id === user.id) ? prev : [...prev, user])
  }

  function handleRowClick(user: User) {
    setSelectedUser(user)
    setShowDetail(true)
  }

  async function handleInactivate(user: User) {
    const updated: User = { ...user, status: 'Inativo' }
    try { await api.updateUser(user.id, updated) } catch { /* silencioso */ }
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u))
  }

  async function handleActivate(user: User) {
    const updated: User = { ...user, status: 'Ativo' }
    try { await api.updateUser(user.id, updated) } catch { /* silencioso */ }
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u))
  }

  function handleVincularSuccess(userId: string, conta: ContaVinculada) {
    setUserAccountsMap(prev => ({
      ...prev,
      [userId]: [...(prev[userId] ?? []), conta],
    }))
  }

  function handlePapelChange(userId: string, accountId: string, novoPapel: 'member' | 'account_admin') {
    setUserAccountsMap(prev => ({
      ...prev,
      [userId]: (prev[userId] ?? []).map(cv =>
        cv.account.id === accountId ? { ...cv, papel: novoPapel } : cv
      ),
    }))
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between px-8 py-4 gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">Escopo: Organização</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">Org Admin</span>
          </div>
          <h1 className="text-2xl font-bold leading-8 text-[#030712]">Usuários</h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-[1080px]">
            Todos os usuários da organização. Aqui você convida membros, vincula-os a contas específicas e define seus papéis. Diferente de <strong className="font-medium text-[#374151]">Permissões</strong>, esta tela tem visão completa da organização — não de uma conta específica.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Button onClick={() => setShowCriar(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Criar usuário
          </Button>
        </div>
      </div>

      <div className="px-8 space-y-5 pb-8">

        {/* Métricas */}
        <div className="flex divide-x divide-gray-200 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {metrics.map(m => (
            <MetricCard key={m.label} label={m.label} value={m.value} loading={loading} />
          ))}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3">
          {/* Busca */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 leading-none">×</button>
            )}
          </div>

          {/* Filtro Função */}
          <div className="relative">
            <select
              value={funcaoFilter}
              onChange={e => setFuncaoFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer text-[#030712]"
            >
              <option value="">Todas as funções</option>
              {funcoes.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[220px]">Usuário</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[100px]">Contas</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[80px]">Grupos</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[110px]">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[140px]">Visto em</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td></tr>
              ) : filtered.length > 0 ? (
                filtered.map(user => (
                  <tr
                    key={user.id}
                    className="group border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer last:border-b-0"
                    onClick={() => handleRowClick(user)}
                  >
                    {/* Usuário: avatar + nome + e-mail */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nome={user.nomeCompleto} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</p>
                          <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Contas */}
                    <td className="px-4 py-3 text-sm text-[#030712]">
                      {userAccountsMap[user.id]?.length ?? 0}
                    </td>
                    {/* Grupos */}
                    <td className="px-4 py-3 text-sm text-[#030712]">
                      {userGruposCount[user.id] ?? 0}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {user.status === 'Ativo'
                        ? <Badge variant="success" showIcon>Ativo</Badge>
                        : <Badge variant="secondary" showIcon>{user.status}</Badge>}
                    </td>
                    {/* Visto em */}
                    <td className="px-4 py-3 text-sm text-[#6b7280]">{user.ultimoAcesso || '—'}</td>
                    {/* Ações — hover only */}
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="invisible group-hover:visible">
                        <Popover
                          content={
                            <div className="flex flex-col gap-1 min-w-[160px]">
                              {user.status === 'Ativo' ? (
                                <button
                                  onClick={() => handleInactivate(user)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left"
                                >
                                  <UserX className="w-4 h-4 shrink-0" />
                                  Inativar usuário
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(user)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 rounded-md transition-colors text-left"
                                >
                                  <UserCheck className="w-4 h-4 shrink-0" />
                                  Ativar usuário
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
                    <p className="text-sm font-medium text-[#030712]">Nenhum usuário encontrado</p>
                    <p className="text-xs text-[#6b7280] mt-1">Ajuste os filtros ou convide um novo usuário.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sheets */}
      <CriarUsuarioSheet
        open={showCriar}
        onClose={() => setShowCriar(false)}
        onSuccess={handleCriarSuccess}
      />
      <UsuarioDetailOrgSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        user={selectedUser}
        contasVinculadas={selectedUser ? (userAccountsMap[selectedUser.id] ?? []) : []}
        todasContas={accounts}
        onVincularSuccess={handleVincularSuccess}
        onPapelChange={handlePapelChange}
      />
    </div>
  )
}
