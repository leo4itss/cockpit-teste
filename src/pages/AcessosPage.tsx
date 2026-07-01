import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Plus, Ellipsis, FilePen, UserX, UserCheck, Eye, Trash2, ChevronDown, HelpCircle, ShieldCheck, Globe, Lock, AlertTriangle, SlidersHorizontal, GitBranch, Info, Users } from 'lucide-react'
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
import { Modal } from '@/components/ui/Modal'
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

  const ALL_ACCOUNTS = '__all__'

  // Seletor persistido em sessionStorage
  const [selectedOrgId,     setSelectedOrgId]     = useSessionState<string>('acessos-orgId', '')
  const [selectedAccountId, setSelectedAccountId] = useSessionState<string>('acessos-accountId', '')

  const [allOrgs,     setAllOrgs]     = useState<any[]>([])
  const [allAccounts, setAllAccounts] = useState<any[]>([])

  // Platform Admin: carrega todas as orgs e auto-seleciona a primeira
  useEffect(() => {
    if (!isPlatformAdmin) return
    api.getOrganizations()
      .then((orgs: any[]) => {
        const active = orgs.filter(o => o.status !== 'Inativo')
        setAllOrgs(active)
        if (!selectedOrgId && active.length > 0) setSelectedOrgId(active[0].id)
      })
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
        const active = accs.filter(a => !a.deletedAt)
        setAllAccounts(active)
        // se a conta selecionada não pertence mais à org escolhida, auto-seleciona a primeira
        if (!selectedAccountId || !active.find(a => a.id === selectedAccountId)) {
          setSelectedAccountId(active.length > 0 ? active[0].id : '')
        }
      })
      .catch(() => {})
  }, [isAccountAdminOnly, isPlatformAdmin, isOrgAdmin, adminOrgId, selectedOrgId])

  // accountId efetivo
  const accountId = isAccountAdminOnly ? (rawAccountId ?? '') : selectedAccountId
  const isAllAccounts = accountId === ALL_ACCOUNTS

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
  const [userAccountMap, setUserAccountMap] = useState<Record<string, string>>({})
  const [loadingUsers, setLoadingUsers]     = useState(true)
  const [searchUsers, setSearchUsers]       = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCriarSheet, setShowCriarSheet]       = useState(false)
  const [showDetailSheet, setShowDetailSheet]     = useState(false)
  const [showEditSheet, setShowEditSheet]         = useState(false)
  const [selectedUser, setSelectedUser]           = useState<User | null>(null)
  const [permEfetivasUser, setPermEfetivasUser]           = useState<User | null>(null)
  const [permEfetivasInstancias, setPermEfetivasInstancias] = useState<{ id: string; nome: string; componenteId: string }[]>([])

  useEffect(() => {
    if (!accountId) return
    setLoadingUsers(true)
    if (isAllAccounts) {
      Promise.all(
        allAccounts.map(acc =>
          api.getAccountMembros(acc.id)
            .then((data: User[]) => data.map(u => ({ u, accName: acc.name })))
            .catch(() => [] as { u: User; accName: string }[])
        )
      ).then(results => {
        const seenIds = new Set<string>()
        const merged: User[] = []
        const map: Record<string, string> = {}
        results.flat().forEach(({ u, accName }) => {
          if (!seenIds.has(u.id)) { seenIds.add(u.id); merged.push(u) }
          if (!map[u.id]) map[u.id] = accName
        })
        setUsers(merged)
        setUserAccountMap(map)
        setLoadingUsers(false)
      })
      return
    }
    api.getAccountMembros(accountId)
      .then(data => { setUsers(data); setUserAccountMap({}); setLoadingUsers(false) })
      .catch(() => {
        const ids = accountMembrosIds[accountId] ?? []
        const fallback = mockUsers.filter(u => ids.includes(u.id))
        setUsers(fallback)
        setUserAccountMap({})
        setLoadingUsers(false)
      })
  }, [accountId, allAccounts])

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

    // Grupos do usuário — necessário para incluir objetos onde o acesso é só via grupo.
    const userGrupos = await api.getUserGrupos(user.id, accountId).catch(() => [] as any[])
    const grupoIds = new Set(userGrupos.map((g: any) => g.id))

    const userInstIds: string[] = []
    await Promise.all(
      instancias.map(inst =>
        api.getInstanciaMembros(inst.id)
          .then((mems: any[]) => {
            const temAcesso = mems.some(m =>
              (m.entidadeTipo === 'user' && m.entidadeId === user.id) ||
              (m.entidadeTipo === 'group' && grupoIds.has(m.entidadeId))
            )
            if (temAcesso) userInstIds.push(inst.id)
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
  const [instancias, setInstancias]               = useState<Instancia[]>([])
  const [instAccountMap, setInstAccountMap]        = useState<Record<string, string>>({})
  const [loadingInstancias, setLoadingInstancias] = useState(true)
  const [searchInstancias, setSearchInstancias]   = useState('')
  const [showInstanciaDetail, setShowInstanciaDetail] = useState(false)
  const [selectedInstancia, setSelectedInstancia]     = useState<Instancia | null>(null)

  useEffect(() => {
    if (!accountId) return
    setLoadingInstancias(true)
    if (isAllAccounts) {
      Promise.all(
        allAccounts.map(acc =>
          api.getInstancias({ accountId: acc.id })
            .then((data: Instancia[]) => data.map(i => ({ i, accName: acc.name })))
            .catch(() => [] as { i: Instancia; accName: string }[])
        )
      ).then(results => {
        const merged: Instancia[] = []
        const map: Record<string, string> = {}
        results.flat().forEach(({ i, accName }) => { merged.push(i); map[i.id] = accName })
        setInstancias(merged)
        setInstAccountMap(map)
        setLoadingInstancias(false)
      })
      return
    }
    api.getInstancias({ accountId })
      .then(data => { setInstancias(data); setInstAccountMap({}); setLoadingInstancias(false) })
      .catch(() => {
        setInstancias(mockInstancias.filter(i => i.accountId === accountId))
        setInstAccountMap({})
        setLoadingInstancias(false)
      })
  }, [accountId, allAccounts])

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
    const orgIdForGrupos = effectiveOrgId
      || allAccounts.find(a => a.id === accountId)?.orgId
      || ''
    const effectiveAccId = isAllAccounts ? undefined : accountId
    if (!orgIdForGrupos && !effectiveAccId) return
    setLoadingGrupos(true)
    api.getGrupos({ orgId: orgIdForGrupos, accountId: effectiveAccId })
      .then(data => { setGrupos(data); setLoadingGrupos(false) })
      .catch(() => {
        const fallback = mockGrupos.filter(g =>
          (effectiveAccId && g.accountId === effectiveAccId) ||
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between px-8 py-4 gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">
              {isAllAccounts ? 'Escopo: Organização' : 'Escopo: Conta'}
            </span>
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
                      {isPlatformAdmin && (
                        <option value={ALL_ACCOUNTS}>Todas as contas</option>
                      )}
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
            {isAllAccounts
              ? <>Visão consolidada de todas as contas da organização. Diferente de <strong className="font-medium text-[#374151]">Usuários</strong> (visão org), aqui você vê membros, grupos e objetos por conta.</>
              : <>Gerencie quem acessa <strong className="font-medium text-[#374151]">esta conta</strong> e com quais permissões. Diferente de <strong className="font-medium text-[#374151]">Usuários</strong> (visão da organização), aqui você vê apenas os membros e grupos desta conta específica.</>
            }
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <button
            onClick={() => setShowOnboarding(true)}
            title="Sobre esta aba"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#6b7280] bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:text-[#030712] hover:border-gray-300 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Sobre</span>
          </button>
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
          {abaAtiva === 'usuarios' && !isAllAccounts ? (
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCriarSheet(true)}>
                <Plus className="w-4 h-4 mr-1.5" />Criar usuário
              </Button>
            </div>
          ) : abaAtiva === 'grupos' && !isPlatformAdmin ? (
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
                  {isAllAccounts && <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[140px]">Conta</th>}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[150px]">Papel</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 min-w-[120px]">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[120px]">Último acesso</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td colSpan={isAllAccounts ? 8 : 7} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td></tr>
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
                      {isAllAccounts && <td className="px-4 py-3 text-sm text-[#6b7280]">{userAccountMap[user.id] ?? '—'}</td>}
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
                  <tr><td colSpan={isAllAccounts ? 8 : 7} className="px-4 py-8 text-center text-sm text-gray-500">Nenhum usuário encontrado</td></tr>
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[130px]">Escopo</th>
                  {isAllAccounts && <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[140px]">Conta</th>}
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[100px]">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingGrupos ? (
                  <tr><td colSpan={isAllAccounts ? 7 : 6} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td></tr>
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
                      <td className="px-4 py-3"><EscopoBadge escopo={grupo.escopo} /></td>
                      {isAllAccounts && (
                        <td className="px-4 py-3 text-sm text-[#6b7280]">
                          {grupo.escopo === 'org' ? <span className="italic text-xs">Org (todas)</span> : (allAccounts.find(a => a.id === grupo.accountId)?.name ?? '—')}
                        </td>
                      )}
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
                    <td colSpan={isAllAccounts ? 7 : 6} className="px-4 py-12 text-center">
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
                          {isAllAccounts && <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[140px]">Conta</th>}
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
                            {isAllAccounts && <td className="px-4 py-3 text-sm text-[#6b7280]">{instAccountMap[inst.id] ?? '—'}</td>}
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

      {/* Modal — Onboarding contextual */}
      <Modal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        title={
          abaAtiva === 'usuarios' ? 'Sobre esta aba — Usuários'
          : abaAtiva === 'grupos' ? 'Sobre esta aba — Grupos'
          : 'Sobre esta aba — Objetos'
        }
        footer={
          <button
            onClick={() => setShowOnboarding(false)}
            className="px-4 py-2 text-sm font-medium text-white bg-[#030712] rounded-lg hover:bg-[#1f2937] transition-colors"
          >
            Entendi
          </button>
        }
      >
        {abaAtiva === 'usuarios' && (
          <div className="space-y-5">
            <p className="text-sm text-[#374151] leading-relaxed">
              Gerencie quem tem acesso a esta conta e qual é o papel de cada pessoa no Cockpit.
            </p>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Papéis disponíveis</p>
              <div className="space-y-2">
                <div className="flex gap-3 p-3 rounded-xl bg-[#f9fafb] border border-[#f3f4f6]">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#030712]">Membro</p>
                    <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">Acessa os produtos conforme as permissões atribuídas nos objetos desta conta.</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-xl bg-[#f9fafb] border border-[#f3f4f6]">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#030712]">Administrador da Conta</p>
                    <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">Gerencia usuários e grupos dentro desta conta.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <Eye className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Use <strong className="font-semibold">"Ver permissões efetivas"</strong> no menu ⋯ para ver tudo que o usuário pode fazer, incluindo permissões herdadas de grupos.
              </p>
            </div>
          </div>
        )}
        {abaAtiva === 'grupos' && (
          <div className="space-y-5">
            <p className="text-sm text-[#374151] leading-relaxed">
              Agrupe usuários para atribuir permissões de uma só vez — ao adicionar um grupo a um objeto, todos os membros herdam automaticamente o acesso.
            </p>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">Tipos de escopo</p>
              <div className="space-y-2">
                <div className="flex gap-3 p-3 rounded-xl bg-[#f9fafb] border border-[#f3f4f6]">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#030712]">Organização</p>
                    <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">Criado pelo Org Admin, compartilhado entre todas as contas. Somente leitura aqui.</p>
                  </div>
                </div>
                <div className="flex gap-3 p-3 rounded-xl bg-[#f9fafb] border border-[#f3f4f6]">
                  <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#030712]">Conta</p>
                    <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">Exclusivo desta conta — criado e gerenciado pelo Account Admin.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                Pertencer a um grupo <strong className="font-semibold">não concede acesso automaticamente</strong>. É preciso adicionar o grupo a um objeto na aba <strong className="font-semibold">Objetos</strong> — somente então seus membros herdam as permissões.
              </p>
            </div>
          </div>
        )}
        {abaAtiva === 'instancias' && (
          <div className="space-y-5">
            <p className="text-sm text-[#374151] leading-relaxed">
              Objetos são instâncias de serviços configurados nesta conta — como MaxDoc, Assistente IA ou Base de Conhecimento.
            </p>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af] mb-3">O que você pode fazer em cada objeto</p>
              <div className="space-y-2">
                {([
                  { icon: <Users className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50', title: 'Adicionar membros', desc: 'Usuários ou grupos com um papel predefinido.' },
                  { icon: <SlidersHorizontal className="w-4 h-4 text-violet-500" />, bg: 'bg-violet-50', title: 'Personalizar ações', desc: 'Edite manualmente as ações disponíveis para cada membro.' },
                  { icon: <GitBranch className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-50', title: 'Ver herança de grupo', desc: 'Veja quais ações um membro herda por pertencer a um grupo.' },
                ] as const).map(({ icon, bg, title, desc }) => (
                  <div key={title} className="flex gap-3 p-3 rounded-xl bg-[#f9fafb] border border-[#f3f4f6]">
                    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#030712]">{title}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                Permissões herdadas de grupos aparecem marcadas em <strong className="font-semibold">verde</strong> e não podem ser editadas diretamente.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
