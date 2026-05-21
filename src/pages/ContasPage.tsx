import { useState, useMemo, useEffect } from 'react'
import {
  Search, Ellipsis, Eye,
  ShieldCheck, UserMinus, Loader2, Building2,
  Bot, Database, Layers, CheckCircle2, XCircle, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Popover } from '@/components/ui/Popover'
import { Dialog } from '@/components/ui/Dialog'
import { useSessionState } from '@/hooks/useSessionState'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { api } from '@/api/client'
import { useAuthz, useIsPlatformAdmin } from '@/authz/hooks'
import { cn } from '@/lib/utils'
import type { Account, User } from '@/types'

// ── Tipos locais ──────────────────────────────────────────────

type MembroWithPapel = User & { papel: 'member' | 'account_admin' }

// ── Avatares coloridos ────────────────────────────────────────

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
function Avatar({ nome, size = 'md' }: { nome: string; size?: 'sm' | 'md' }) {
  const { bg, text } = getAvatarColor(nome)
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className={cn(
      'rounded-full shrink-0 flex items-center justify-center font-semibold select-none',
      bg, text,
      size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs',
    )}>
      {ini}
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────────

function PapelBadge({ papel }: { papel: 'member' | 'account_admin' }) {
  return papel === 'account_admin'
    ? <Badge variant="warning">Account Admin</Badge>
    : <Badge variant="default">Member</Badge>
}

function StatusBadge({ status }: { status: Account['status'] }) {
  if (status === 'Ativo')  return <Badge variant="success">Ativo</Badge>
  if (status === 'Criado') return <Badge variant="info">Criado</Badge>
  return <Badge variant="secondary">Inativo</Badge>
}

// ─────────────────────────────────────────────────────────────
// PromoverAdminDialog
// ─────────────────────────────────────────────────────────────

interface PromoverProps {
  open:       boolean
  onClose:    () => void
  account:    Account | null
  elegíveis:  MembroWithPapel[]        // membros que ainda NÃO são account_admin
  onConfirm:  (userId: string) => Promise<void>
}

function PromoverAdminDialog({ open, onClose, account, elegíveis, onConfirm }: PromoverProps) {
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleConfirm() {
    if (!selectedId) return
    setSaving(true)
    setError(null)
    try {
      await onConfirm(selectedId)
      setSelectedId('')
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao promover usuário.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setSelectedId(''); setError(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Promover a Account Admin"
      description={account ? `Selecione o usuário que será promovido a administrador de "${account.name}".` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedId || saving}>
            {saving ? 'Promovendo...' : 'Confirmar promoção'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {elegíveis.length === 0 ? (
          <p className="text-sm text-[#6b7280]">
            Todos os usuários vinculados a esta conta já são Account Admin.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#030712]">
                Usuário <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                disabled={saving}
                className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50"
              >
                <option value="">Selecione o usuário...</option>
                {elegíveis.map(m => (
                  <option key={m.id} value={m.id}>{m.nomeCompleto} — {m.email}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-[#6b7280]">
              Somente usuários já vinculados a esta conta podem ser promovidos. O papel Member permanece até a promoção ser confirmada.
            </p>
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────
// RemoverMembroDialog
// ─────────────────────────────────────────────────────────────

interface RemoverProps {
  open:      boolean
  onClose:   () => void
  membro:    MembroWithPapel | null
  account:   Account | null
  onConfirm: () => Promise<void>
}

function RemoverMembroDialog({ open, onClose, membro, account, onConfirm }: RemoverProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao remover usuário.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() { setError(null); onClose() }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Remover da conta"
      description={
        membro && account
          ? `Tem certeza que deseja remover "${membro.nomeCompleto}" da conta "${account.name}"?`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Removendo...' : 'Remover da conta'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[#6b7280]">
          O usuário perderá o acesso a esta conta mas permanecerá na organização. Esta ação pode ser revertida vinculando o usuário novamente.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Dialog>
  )
}

// ── Catálogo de Capabilities ──────────────────────────────────
// Alinhado com o spec: capability:assistant.use (policy-assistant-river-valadao.md)

type CapabilityDef = {
  id: string
  nome: string
  descricao: string
  icon: React.ElementType
  color: string
}

const CAPABILITIES: CapabilityDef[] = [
  {
    id:       'assistant.use',
    nome:     'Assistente de IA',
    descricao: 'Permite que usuários da conta utilizem o assistente de IA (chat, RAG, agentes). Obrigatório para qualquer ação no assistente.',
    icon:     Bot,
    color:    'text-violet-500',
  },
  {
    id:       'knowledge.use',
    nome:     'Base de Conhecimento',
    descricao: 'Permite acesso à base de conhecimento corporativa para leitura e edição de documentos.',
    icon:     Database,
    color:    'text-blue-500',
  },
  {
    id:       'analytics.use',
    nome:     'Analytics',
    descricao: 'Permite acesso aos dashboards e relatórios analíticos da conta.',
    icon:     Layers,
    color:    'text-teal-500',
  },
]

// ─────────────────────────────────────────────────────────────
// ContaDetailSheet
// ─────────────────────────────────────────────────────────────

type ContaDetailTab = 'usuarios' | 'capacidades'

interface ContaDetailProps {
  open:     boolean
  onClose:  () => void
  account:  Account | null
}

function ContaDetailSheet({ open, onClose, account }: ContaDetailProps) {
  const [tab, setTab] = useState<ContaDetailTab>('usuarios')

  // ── Usuários ────────────────────────────────────────────────
  const [membros, setMembros]         = useState<MembroWithPapel[]>([])
  const [loading, setLoading]         = useState(false)
  const [showPromover, setShowPromover] = useState(false)
  const [pendingRemover, setPendingRemover] = useState<MembroWithPapel | null>(null)

  // ── Capacidades ─────────────────────────────────────────────
  const [activeCapabilities, setActiveCapabilities] = useState<string[]>([])
  const [loadingCaps, setLoadingCaps]     = useState(false)
  const [togglingCap, setTogglingCap]     = useState<string | null>(null)

  useEffect(() => {
    if (!open || !account) return
    let cancelled = false

    setLoading(true)
    setLoadingCaps(true)
    setTab('usuarios')

    api.getAccountMembros(account.id)
      .then((data: any[]) => {
        if (cancelled) return
        setMembros(data as MembroWithPapel[])
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    api.getEntitlements(account.id)
      .then((data: any[]) => {
        if (cancelled) return
        setActiveCapabilities(data.map((e: any) => e.capability))
        setLoadingCaps(false)
      })
      .catch(() => { if (!cancelled) setLoadingCaps(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account?.id])

  const elegíveis = useMemo(
    () => membros.filter(m => m.papel !== 'account_admin'),
    [membros]
  )

  async function handlePromover(userId: string) {
    if (!account) return
    await api.addAccountMembro(account.id, { userId, papel: 'account_admin' })
    setMembros(prev =>
      prev.map(m => m.id === userId ? { ...m, papel: 'account_admin' } : m)
    )
  }

  async function handleRemover() {
    if (!account || !pendingRemover) return
    await api.removeAccountMembro(account.id, pendingRemover.id)
    setMembros(prev => prev.filter(m => m.id !== pendingRemover.id))
    setPendingRemover(null)
  }

  async function handleToggleCapability(capId: string) {
    if (!account || togglingCap) return
    const isActive = activeCapabilities.includes(capId)
    setTogglingCap(capId)
    try {
      if (isActive) {
        await api.removeEntitlement(account.id, capId)
        setActiveCapabilities(prev => prev.filter(c => c !== capId))
      } else {
        await api.addEntitlement(account.id, capId)
        setActiveCapabilities(prev => [...prev, capId])
      }
    } finally {
      setTogglingCap(null)
    }
  }

  function handleClose() {
    setMembros([]); setLoading(false)
    setShowPromover(false); setPendingRemover(null)
    setActiveCapabilities([]); setLoadingCaps(false); setTogglingCap(null)
    onClose()
  }

  if (!account) return null

  return (
    <>
      <NestedSheet open={open} onClose={handleClose} width="w-[600px]">
        <NestedSheetHeader onClose={handleClose}>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={account.status} />
          </div>
          <NestedSheetTitle>{account.name}</NestedSheetTitle>
          <NestedSheetDescription>
            Subdomínio: <span className="font-medium text-[#030712]">{account.subdomain}</span>
          </NestedSheetDescription>
        </NestedSheetHeader>

        <NestedSheetBody noPadding>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6">
            {(['usuarios', 'capacidades'] as ContaDetailTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-1 py-3 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors',
                  tab === t
                    ? 'border-[#030712] text-[#030712]'
                    : 'border-transparent text-[#6b7280] hover:text-[#030712]'
                )}
              >
                {t === 'usuarios' ? (
                  <>Usuários {!loading && <span className="ml-1 text-xs font-normal text-[#6b7280]">({membros.length})</span>}</>
                ) : (
                  <>Capacidades {!loadingCaps && <span className="ml-1 text-xs font-normal text-[#6b7280]">({activeCapabilities.length}/{CAPABILITIES.length})</span>}</>
                )}
              </button>
            ))}
          </div>

          {/* ── Aba Usuários ── */}
          {tab === 'usuarios' && (
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  Carregando usuários...
                </div>
              ) : membros.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Building2 className="w-8 h-8 text-gray-300" />
                  <p className="text-sm font-medium text-[#030712]">Nenhum usuário vinculado</p>
                  <p className="text-xs text-[#6b7280] text-center max-w-xs">
                    Usuários são vinculados a esta conta pelo Org Admin na tela de Usuários.
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <tbody>
                    {membros.map(membro => (
                      <tr
                        key={membro.id}
                        className="group border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-b-0"
                      >
                        <td className="pl-6 pr-3 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar nome={membro.nomeCompleto} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#030712] truncate">{membro.nomeCompleto}</p>
                              <p className="text-xs text-[#6b7280] truncate">{membro.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <PapelBadge papel={membro.papel} />
                        </td>
                        <td className="pr-6 pl-3 py-3 text-right">
                          <div className="invisible group-hover:visible">
                            <button
                              onClick={() => setPendingRemover(membro)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              Remover da conta
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Aba Capacidades ── */}
          {tab === 'capacidades' && (
            <div className="flex-1 overflow-y-auto">
              {/* Banner explicativo */}
              <div className="mx-6 mt-5 mb-4 p-3.5 rounded-xl border border-blue-100 bg-blue-50">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>Regra de decisão:</strong> <code className="bg-blue-100 px-1 rounded text-[11px]">allow = permission AND entitlement</code><br />
                  Ativar uma capacidade aqui equivale à tupla FGA{' '}
                  <code className="bg-blue-100 px-1 rounded text-[11px]">account:{account.id} enabled_for_tenant capability:X</code>.
                  Sem o entitlement ativo, nenhuma permissão individual é suficiente para liberar o acesso.
                </p>
              </div>

              {loadingCaps ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  Carregando capacidades...
                </div>
              ) : (
                <div className="px-6 pb-6 flex flex-col gap-3">
                  {CAPABILITIES.map(cap => {
                    const isActive  = activeCapabilities.includes(cap.id)
                    const isLoading = togglingCap === cap.id
                    const Icon      = cap.icon
                    return (
                      <div
                        key={cap.id}
                        className={cn(
                          'flex items-start gap-4 p-4 rounded-xl border transition-colors',
                          isActive
                            ? 'border-green-200 bg-green-50/60'
                            : 'border-gray-200 bg-white',
                        )}
                      >
                        {/* Ícone */}
                        <div className={cn('mt-0.5 shrink-0', cap.color)}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Texto */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-medium text-[#030712]">{cap.nome}</p>
                            {isActive
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> Ativo
                                </span>
                              : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                                  <XCircle className="w-3 h-3" /> Inativo
                                </span>
                            }
                          </div>
                          <p className="text-xs text-[#6b7280] leading-relaxed">{cap.descricao}</p>
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">capability:{cap.id}</p>
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={() => handleToggleCapability(cap.id)}
                          disabled={!!togglingCap}
                          className={cn(
                            'shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none mt-0.5',
                            isActive ? 'bg-green-500' : 'bg-gray-200',
                            togglingCap && 'opacity-50 cursor-not-allowed',
                          )}
                          title={isActive ? 'Desativar' : 'Ativar'}
                        >
                          {isLoading
                            ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin absolute left-1/2 -translate-x-1/2" />
                            : <span className={cn(
                                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                                isActive ? 'translate-x-6' : 'translate-x-1',
                              )} />
                          }
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </NestedSheetBody>

        <NestedSheetFooter className="justify-between">
          {tab === 'usuarios' ? (
            <Button
              variant="outline"
              onClick={() => setShowPromover(true)}
              disabled={loading || elegíveis.length === 0}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Promover a Account Admin
            </Button>
          ) : (
            <p className="text-xs text-[#6b7280]">
              Alterações são aplicadas imediatamente e refletem nas tuplas FGA.
            </p>
          )}
          <Button variant="ghost" onClick={handleClose}>Fechar</Button>
        </NestedSheetFooter>
      </NestedSheet>

      {/* Dialogs — fora da NestedSheet para z-index correto */}
      <PromoverAdminDialog
        open={showPromover}
        onClose={() => setShowPromover(false)}
        account={account}
        elegíveis={elegíveis}
        onConfirm={handlePromover}
      />
      <RemoverMembroDialog
        open={!!pendingRemover}
        onClose={() => setPendingRemover(null)}
        membro={pendingRemover}
        account={account}
        onConfirm={handleRemover}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// ContasPage — Org Admin
// ─────────────────────────────────────────────────────────────

export function ContasPage() {
  const { currentUser, relations } = useAuthz()
  const isPlatformAdmin = useIsPlatformAdmin()
  // Platform Admin vê todas as contas (sem filtro de org).
  // Org Admin filtra pela sua organização.
  const orgAdminEntry = relations.orgAdmins.find(a => a.userId === currentUser.id)
  const adminOrgId    = isPlatformAdmin ? undefined : (orgAdminEntry?.orgId ?? undefined)

  const [accounts, setAccounts]     = useState<Account[]>([])
  const [userCountMap, setUserCountMap] = useState<Record<string, number>>({})
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  const [showDetail, setShowDetail]         = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  // ── Fetch ─────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    api.getAccounts(adminOrgId)
      .then(async (fetchedAccounts: Account[]) => {
        setAccounts(fetchedAccounts)
        const counts = await Promise.all(
          fetchedAccounts.map(acc =>
            api.getAccountMembros(acc.id)
              .then((mems: any[]) => ({ id: acc.id, count: mems.length }))
              .catch(() => ({ id: acc.id, count: 0 }))
          )
        )
        const map: Record<string, number> = {}
        counts.forEach(({ id, count }) => { map[id] = count })
        setUserCountMap(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [adminOrgId])

  // ── Filtro ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return accounts.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.subdomain ?? '').toLowerCase().includes(q)
    )
  }, [accounts, search])

  // ── Handlers ──────────────────────────────────────────────

  function handleRowClick(account: Account) {
    setSelectedAccount(account)
    setShowDetail(true)
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
          <h1 className="text-2xl font-bold leading-8 text-[#030712]">Contas</h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-[1080px]">
            Contas são subdivisões da organização — cada uma com seus próprios usuários, grupos e capacidades ativas. Para criar uma conta, acesse o detalhe da organização em <strong className="font-medium text-[#374151]">Organizações</strong>.
          </p>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-4">

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Buscar por nome ou subdomínio"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 leading-none">×</button>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[220px]">Nome da conta</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[100px]">Usuários</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[130px]">Componentes</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[110px]">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(account => (
                  <tr
                    key={account.id}
                    className="group border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer last:border-b-0"
                    onClick={() => handleRowClick(account)}
                  >
                    {/* Nome + subdomínio */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#030712]">{account.name}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{account.subdomain}</p>
                    </td>

                    {/* Usuários */}
                    <td className="px-4 py-3 text-sm text-[#030712]">
                      {userCountMap[account.id] ?? 0}
                    </td>

                    {/* Componentes — placeholder */}
                    <td className="px-4 py-3 text-sm text-[#6b7280]">—</td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={account.status} />
                    </td>

                    {/* Ações — hover only */}
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="invisible group-hover:visible">
                        <Popover
                          content={
                            <div className="flex flex-col gap-1 min-w-[160px]">
                              <button
                                onClick={() => handleRowClick(account)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left"
                              >
                                <Eye className="w-4 h-4 shrink-0" />
                                Ver detalhes
                              </button>
                            </div>
                          }
                        >
                          <button
                            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                            title="Ações"
                          >
                            <Ellipsis className="w-4 h-4 text-gray-600" />
                          </button>
                        </Popover>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-[#030712]">Nenhuma conta encontrada</p>
                    <p className="text-xs text-[#6b7280] mt-1">
                      {search ? 'Ajuste a busca ou crie uma nova conta.' : 'Crie a primeira conta desta organização.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sheets */}
      <ContaDetailSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        account={selectedAccount}
      />
    </div>
  )
}
