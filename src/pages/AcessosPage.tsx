import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Plus, Ellipsis, FilePen, UserX, UserCheck, Eye, Trash2, Building2, ChevronDown, HelpCircle } from 'lucide-react'
import { useSessionState } from '@/hooks/useSessionState'
import { useAdminOrgId } from '@/authz/hooks'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Popover } from '@/components/ui/Popover'
import { UsuarioDetailAccountSheet } from '@/components/usuarios/UsuarioDetailAccountSheet'
import { EditUserSheet } from '@/components/EditUserSheet'
import { CriarUsuarioSheet } from '@/components/usuarios/CriarUsuarioSheet'
import { api } from '@/api/client'
import { grupos as mockGrupos, users as mockUsers, accountMembrosIds, instancias as mockInstancias } from '@/data/mock'
import { useAdminAccountId, useIsPlatformAdmin, useIsOrgAdmin, useIsAccountAdmin } from '@/authz/hooks'
import { cn } from '@/lib/utils'
import type { User, Grupo } from '@/types'

import { CriarGrupoSheet } from '@/components/grupos/CriarGrupoSheet'
import { GrupoDetailSheet } from '@/components/grupos/GrupoDetailSheet'
import { InstanciaDetailSheet } from '@/components/instancias/InstanciaDetailSheet'
import { PermissoesEfetivasSheet } from '@/components/permissoes/PermissoesEfetivasSheet'
import type { Instancia } from '@/types'

type Aba = 'usuarios' | 'grupos' | 'instancias'

// orgId fixo removido — agora derivado dinamicamente do usuário logado

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

const PAPEL_LABELS: Record<string, string> = {
  'Viewer': 'Visualizador',
  'User':   'Usuário',
  'Admin':  'Administrador',
}

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
      {PAPEL_LABELS[papel] ?? papel}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────

export function AcessosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const abaParam = searchParams.get('aba') as Aba | null
  const abaAtiva: Aba = abaParam === 'grupos' ? 'grupos' : abaParam === 'instancias' ? 'instancias' : 'usuarios'

  const rawAccountId    = useAdminAccountId()          // accountId fixo do Account Admin (null para outros)
  const isPlatformAdmin = useIsPlatformAdmin()
  const isOrgAdmin      = useIsOrgAdmin()
  const isAccountAdmin  = useIsAccountAdmin()
  const adminOrgId      = useAdminOrgId()              // orgId do Org Admin (para filtrar contas)

  // Account Admin puro: não é nem Org Admin nem Platform Admin
  const isAccountAdminOnly = isAccountAdmin && !isOrgAdmin && !isPlatformAdmin

  // Seletor persistido em sessionStorage
  const [selectedOrgId,     setSelectedOrgId]     = useSessionState<string>('acessos-orgId', '')
  const [selectedAccountId, setSelectedAccountId] = useSessionState<string>('acessos-accountId', '')

  const [allOrgs,     setAllOrgs]     = useState<any[]>([])
  const [allAccounts, setAllAccounts] = useState<any[]>([])

  // Platform Admin: carrega todas as orgs
  useEffect(() => {
    if (!isPlatformAdmin) return
    api.getOrganizations()
      .then((orgs: any[]) => setAllOrgs(orgs.filter(o => o.status !== 'Inativo')))
      .catch(() => {})
  }, [isPlatformAdmin])

  // Carrega contas:
  //   Platform Admin → filtra pela org selecionada (quando há uma)
  //   Org Admin      → sempre filtra pela sua org
  useEffect(() => {
    if (isAccountAdminOnly) return
    const orgFilter = isPlatformAdmin
      ? (selectedOrgId || undefined)
      : (isOrgAdmin && adminOrgId ? adminOrgId : undefined)
    if (isPlatformAdmin && !selectedOrgId) { setAllAccounts([]); return }
    api.getAccounts(orgFilter)
      .then((accs: any[]) => {
        setAllAccounts(accs.filter(a => !a.deletedAt))
        // se a conta selecionada não pertence mais à org escolhida, limpa
        if (selectedAccountId && !accs.find(a => a.id === selectedAccountId)) {
          setSelectedAccountId('')
        }
      })
      .catch(() => {})
  }, [isAccountAdminOnly, isPlatformAdmin, isOrgAdmin, adminOrgId, selectedOrgId])

  // accountId efetivo
  const accountId = isAccountAdminOnly ? (rawAccountId ?? '') : selectedAccountId

  // orgId efetivo — derivado do papel do usuário logado
  const effectiveOrgId = isPlatformAdmin
    ? selectedOrgId
    : isOrgAdmin
      ? (adminOrgId ?? '')
      : ''   // Account Admin: orgId vem da conta (ver busca de grupos abaixo)

  // Nome da conta — para o header (Account Admin puro)
  const [accountNome, setAccountNome] = useState<string | null>(null)
  useEffect(() => {
    if (!isAccountAdminOnly || !accountId) return
    api.getAccount(accountId)
      .then((acc: any) => setAccountNome(acc?.name ?? null))
      .catch(() => setAccountNome(null))
  }, [isAccountAdminOnly, accountId])

  function setAba(aba: Aba) {
    setSearchParams({ aba }, { replace: true })
  }

  // ── Usuários ────────────────────────────────────────────────
  const [users, setUsers]                   = useState<User[]>([])
  const [loadingUsers, setLoadingUsers]     = useState(true)
  const [searchUsers, setSearchUsers]       = useState('')
  const [showCriarSheet, setShowCriarSheet]       = useState(false)
  const [showDetailSheet, setShowDetailSheet]     = useState(false)
  const [showEditSheet, setShowEditSheet]         = useState(false)
  const [selectedUser, setSelectedUser]           = useState<User | null>(null)
  const [permEfetivasUser, setPermEfetivasUser]           = useState<User | null>(null)
  const [permEfetivasInstancias, setPermEfetivasInstancias] = useState<{ id: string; nome: string; componenteId: string }[]>([])

  useEffect(() => {
    if (!accountId) return
    // Busca apenas os membros desta conta (não todos os usuários do sistema)
    api.getAccountMembros(accountId)
      .then(data => { setUsers(data); setLoadingUsers(false) })
      .catch(() => {
        // Fallback: filtra mock local pelos membros conhecidos da conta
        const ids = accountMembrosIds[accountId] ?? []
        const fallback = mockUsers.filter(u => ids.includes(u.id))
        setUsers(fallback)
        setLoadingUsers(false)
      })
  }, [accountId])

  const filteredUsers = useMemo(() => {
    const q = searchUsers.toLowerCase()
    return users.filter(u =>
      u.nomeCompleto.toLowerCase().includes(q) ||
      u.usuario.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  }, [users, searchUsers])

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

  async function handleActivateUser(user: User) {
    const ativado: User = { ...user, status: 'Ativo' }
    try {
      const saved = await api.updateUser(user.id, ativado)
      setUsers(p => p.map(u => u.id === saved.id ? saved : u))
    } catch {
      setUsers(p => p.map(u => u.id === user.id ? ativado : u))
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return
    try { await api.deleteUser(selectedUser.id) } catch { /* silencioso */ }
    setUsers(p => p.filter(u => u.id !== selectedUser.id))
    setShowEditSheet(false)
    setSelectedUser(null)
  }

  async function handleOpenPermEfetivas(user: User) {
    setPermEfetivasUser(user)
    setPermEfetivasInstancias([])
    const userInstIds: string[] = []
    await Promise.all(
      instancias.map(inst =>
        api.getInstanciaMembros(inst.id)
          .then((mems: any[]) => {
            if (mems.some(m => m.entidadeTipo === 'user' && m.entidadeId === user.id)) {
              userInstIds.push(inst.id)
            }
          })
          .catch(() => {})
      )
    )
    setPermEfetivasInstancias(
      instancias
        .filter(i => userInstIds.includes(i.id))
        .map(i => ({ id: i.id, nome: i.nome, componenteId: i.componenteId }))
    )
  }

  // ── Instâncias ──────────────────────────────────────────────
  const [instancias, setInstancias]             = useState<Instancia[]>([])
  const [loadingInstancias, setLoadingInstancias] = useState(true)
  const [searchInstancias, setSearchInstancias]   = useState('')
  const [showInstanciaDetail, setShowInstanciaDetail] = useState(false)
  const [selectedInstancia, setSelectedInstancia]     = useState<Instancia | null>(null)

  useEffect(() => {
    if (!accountId) return
    api.getInstancias({ accountId })
      .then(data => { setInstancias(data); setLoadingInstancias(false) })
      .catch(() => {
        // Fallback: filtra mock local pela conta
        setInstancias(mockInstancias.filter(i => i.accountId === accountId))
        setLoadingInstancias(false)
      })
  }, [accountId])

  // Mapa de componenteId → nome (para exibir na coluna Componente)
  const [componenteNomes, setComponenteNomes] = useState<Record<string, string>>({})
  const [componenteTipoModelos, setComponenteTipoModelos] = useState<Record<string, string>>({})
  useEffect(() => {
    api.getComponentes()
      .then(data => {
        const nomes: Record<string, string> = {}
        const tipos: Record<string, string> = {}
        data.forEach((c: any) => {
          nomes[c.id] = c.nome
          tipos[c.id] = c.tipoModelo ?? 'fga'
        })
        setComponenteNomes(nomes)
        setComponenteTipoModelos(tipos)
      })
      .catch(() => {})
  }, [])

  const filteredInstancias = useMemo(() => {
    const q = searchInstancias.toLowerCase()
    return instancias.filter(i =>
      i.nome.toLowerCase().includes(q) ||
      (i.descricao ?? '').toLowerCase().includes(q) ||
      (componenteNomes[i.componenteId] ?? '').toLowerCase().includes(q)
    )
  }, [instancias, searchInstancias, componenteNomes])

  // Nomes únicos de componentes ativos na conta (para determinar papéis disponíveis)
  const componentesAtivos = useMemo(() => {
    const nomes = new Set<string>()
    instancias.forEach(inst => {
      const nome = componenteNomes[inst.componenteId]
      if (nome) nomes.add(nome)
    })
    return [...nomes]
  }, [instancias, componenteNomes])

  // Agrupa instâncias por componenteId para exibição agrupada
  const instanciasPorComponente = useMemo(() => {
    const map: Record<string, Instancia[]> = {}
    filteredInstancias.forEach(inst => {
      if (!map[inst.componenteId]) map[inst.componenteId] = []
      map[inst.componenteId].push(inst)
    })
    return map
  }, [filteredInstancias])

  // ── Grupos ──────────────────────────────────────────────────
  const [grupos, setGrupos]               = useState<Grupo[]>([])
  const [loadingGrupos, setLoadingGrupos] = useState(true)
  const [searchGrupos, setSearchGrupos]   = useState('')
  const [showCriarGrupoSheet, setShowCriarGrupoSheet]       = useState(false)
  const [showGrupoDetailSheet, setShowGrupoDetailSheet]     = useState(false)
  const [selectedGrupo, setSelectedGrupo]                   = useState<Grupo | null>(null)

  useEffect(() => {
    // Para Account Admin puro, derivamos o orgId da conta selecionada (allAccounts)
    const orgIdForGrupos = effectiveOrgId
      || allAccounts.find(a => a.id === accountId)?.orgId
      || ''
    if (!orgIdForGrupos && !accountId) return
    api.getGrupos({ orgId: orgIdForGrupos, accountId })
      .then(data => { setGrupos(data); setLoadingGrupos(false) })
      .catch(() => {
        // Fallback: filtra mock local pelo accountId ou orgId
        const fallback = mockGrupos.filter(g =>
          (accountId && g.accountId === accountId) ||
          (orgIdForGrupos && g.orgId === orgIdForGrupos)
        )
        setGrupos(fallback)
        setLoadingGrupos(false)
      })
  }, [accountId, effectiveOrgId, allAccounts])

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
  const searchQuery = abaAtiva === 'usuarios' ? searchUsers : abaAtiva === 'grupos' ? searchGrupos : searchInstancias
  function handleSearchChange(v: string) {
    if (abaAtiva === 'usuarios') setSearchUsers(v)
    else if (abaAtiva === 'grupos') setSearchGrupos(v)
    else setSearchInstancias(v)
  }

  // ── Render ──────────────────────────────────────────────────

  // Org Admin / Platform Admin sem conta selecionada → mostrar seletor em cascata
  if (!isAccountAdminOnly && !selectedAccountId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-6">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-gray-400" />
        </div>
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-gray-800">Selecione uma conta</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Esta página exibe acessos de uma conta específica. Escolha{isPlatformAdmin ? ' a organização e' : ''} a conta que deseja visualizar.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-72">
          {/* Seletor de org — só Platform Admin */}
          {isPlatformAdmin && (
            <div className="relative">
              <select
                value={selectedOrgId}
                onChange={e => { setSelectedOrgId(e.target.value); setSelectedAccountId('') }}
                className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-[#030712]"
              >
                <option value="">1. Selecione a organização...</option>
                {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* Seletor de conta */}
          <div className="relative">
            <select
              value=""
              onChange={e => setSelectedAccountId(e.target.value)}
              disabled={isPlatformAdmin && !selectedOrgId}
              className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-[#030712] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{isPlatformAdmin ? '2. ' : ''}Selecione a conta...</option>
              {allAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between px-8 py-4 gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">Escopo: Conta</span>
            {isAccountAdmin && !isPlatformAdmin && !isOrgAdmin && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">Account Admin</span>
            )}
            {/* Seletor de org (Platform Admin) + conta (Org Admin / Platform Admin) */}
            {!isAccountAdminOnly ? (
              <>
                {isPlatformAdmin && allOrgs.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedOrgId}
                      onChange={e => { setSelectedOrgId(e.target.value); setSelectedAccountId('') }}
                      className="appearance-none pl-2 pr-6 py-0.5 text-[11px] font-medium border border-gray-200 rounded-full bg-gray-50 text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {allOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                )}
                {allAccounts.length > 0 && (
                  <div className="relative">
                    <select
                      value={accountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="appearance-none pl-2 pr-6 py-0.5 text-[11px] font-medium border border-gray-200 rounded-full bg-gray-50 text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {allAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </>
            ) : accountNome ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-600 border border-gray-200">
                Conta: <strong className="font-semibold">{accountNome}</strong>
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-bold leading-8 text-[#030712]">Acessos</h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-[1080px]">
            Gerencie quem acessa <strong className="font-medium text-[#374151]">esta conta</strong> e com quais permissões.
            Diferente de <strong className="font-medium text-[#374151]">Usuários</strong> (visão da organização), aqui você vê apenas os membros e grupos desta conta específica.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
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
              <Button onClick={() => setShowCriarSheet(true)}>
                <Plus className="w-4 h-4 mr-1.5" />Criar usuário
              </Button>
            </div>
          ) : abaAtiva === 'grupos' ? (
            <Button onClick={() => setShowCriarGrupoSheet(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Criar grupo
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-gray-200">
        <div className="flex">
          {([
            { id: 'usuarios',   label: 'Usuários' },
            { id: 'grupos',     label: 'Grupos' },
            { id: 'instancias', label: 'Objetos' },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                abaAtiva === id
                  ? 'border-[#030712] text-[#030712]'
                  : 'border-transparent text-[#6b7280] hover:text-[#030712] hover:border-gray-300'
              )}
            >
              {label}
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[150px]">Papel</th>
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
                      <td className="px-4 py-3">
                        {user.papel === 'account_admin'
                          ? <Badge variant="warning">Administrador da Conta</Badge>
                          : <Badge variant="default">Membro</Badge>}
                      </td>
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
                                <button
                                  onClick={() => handleOpenPermEfetivas(user)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left"
                                >
                                  <Eye className="w-4 h-4 shrink-0" />Ver permissões efetivas
                                </button>
                                {user.status === 'Ativo' ? (
                                  <button onClick={() => handleInactivateUser(user)} className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left">
                                    <UserX className="w-4 h-4 shrink-0" />Inativar usuário
                                  </button>
                                ) : (
                                  <button onClick={() => handleActivateUser(user)} className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 rounded-md transition-colors text-left">
                                    <UserCheck className="w-4 h-4 shrink-0" />Ativar usuário
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[130px]">Papel</th>
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

      {/* ── Aba Objetos ── */}
      {abaAtiva === 'instancias' && (
        <div className="px-8 pt-6 pb-8">
          <p className="text-sm text-[#6b7280] mb-4">
            Objetos são serviços configurados dentro desta conta — cada um com sua própria lista de membros e níveis de acesso.
            O acesso a um objeto não é herdado automaticamente do componente ao qual pertence.
          </p>

          {loadingInstancias ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">Carregando objetos...</div>
          ) : filteredInstancias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-sm font-medium text-[#030712]">Nenhum objeto encontrado</p>
              <p className="text-xs text-[#6b7280]">Esta conta ainda não possui objetos configurados.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(instanciasPorComponente).map(([componenteId, insts]) => (
                <div key={componenteId}>
                  {/* Cabeçalho de grupo por componente */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {componenteNomes[componenteId] ?? componenteId}
                    </span>
                    <span className="text-xs text-gray-400">({insts.length} {insts.length === 1 ? 'objeto' : 'objetos'})</span>
                    <div className="flex-1 h-px bg-gray-200 ml-1" />
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40">Nome</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[80px]">Membros</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[100px]">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insts.map(inst => (
                          <tr
                            key={inst.id}
                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer last:border-b-0"
                            onClick={() => { setSelectedInstancia(inst); setShowInstanciaDetail(true) }}
                          >
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-[#030712]">{inst.nome}</p>
                              {inst.descricao && (
                                <p className="text-xs text-[#6b7280] mt-0.5 max-w-xs truncate">{inst.descricao}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#030712]">{inst.qtdMembros ?? 0}</td>
                            <td className="px-4 py-3 text-center">
                              {inst.status === 'Ativo'
                                ? <Badge variant="success">Ativo</Badge>
                                : <Badge variant="secondary">Inativo</Badge>}
                            </td>
                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => navigate(`/instancia/${inst.id}`)}
                                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                                title="Gerenciar membros"
                              >
                                <Search className="w-4 h-4 text-gray-500" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sheets — Usuários */}
      <CriarUsuarioSheet
        open={showCriarSheet}
        onClose={() => setShowCriarSheet(false)}
        onSuccess={handleCriarSuccess}
        accountId={accountId || undefined}
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
        componentesAtivos={componentesAtivos}
        onSuccess={grupo => setGrupos(prev => [...prev, grupo])}
      />
      <GrupoDetailSheet
        open={showGrupoDetailSheet}
        onClose={() => setShowGrupoDetailSheet(false)}
        grupo={selectedGrupo}
        accountId={accountId}
        onUpdate={updated => setGrupos(prev => prev.map(g => g.id === updated.id ? updated : g))}
      />

      {/* Sheet — Instâncias */}
      <InstanciaDetailSheet
        open={showInstanciaDetail}
        onClose={() => setShowInstanciaDetail(false)}
        instancia={selectedInstancia}
        componenteNome={selectedInstancia ? componenteNomes[selectedInstancia.componenteId] : undefined}
        componenteTipoModelo={selectedInstancia ? ((componenteTipoModelos[selectedInstancia.componenteId] ?? 'fga') as 'fga' | 'docnix' | 'custom') : 'fga'}
        accountNome={accountNome ?? undefined}
        accountId={accountId}
      />

      {/* Sheet — Permissões Efetivas (a partir da aba Usuários) */}
      {permEfetivasUser && (
        <PermissoesEfetivasSheet
          open={true}
          onClose={() => setPermEfetivasUser(null)}
          userId={permEfetivasUser.id}
          userName={permEfetivasUser.nomeCompleto}
          instancias={permEfetivasInstancias}
          componenteNomes={componenteNomes}
        />
      )}
    </div>
  )
}
