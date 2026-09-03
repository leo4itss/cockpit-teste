import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, MessageCircle, Mail, ExternalLink, Bot, Database, Layers, FileText, Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { useToast, ToastContainer } from './ui/Toast'
import { cn } from '@/lib/utils'
import { api } from '@/api/client'
import { buildTenantDomain } from '@/services/provisioning'
import { accountEntitlements as mockEntitlements } from '@/data/mock'
import type { Account, Organization } from '@/types'

// ── Capabilities catalog ─────────────────────────────────────

type CapabilityDef = {
  id:       string
  nome:     string
  descricao: string
  icon:     React.ElementType
  color:    string
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
  {
    id:       'maxdoc.use',
    nome:     'MaxDoc',
    descricao: 'Permite acesso ao módulo de gestão documental MaxDoc (criação, aprovação, revisão e publicação de documentos).',
    icon:     FileText,
    color:    'text-orange-500',
  },
  {
    id:       'docaction.use',
    nome:     'DocAction',
    descricao: 'Permite acesso ao módulo de ações corretivas e preventivas DocAction (ocorrências, planos de ação, análise de causa).',
    icon:     Zap,
    color:    'text-yellow-500',
  },
]

// ── Props ────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
  account: Account | null
  org:     Organization | null
  onEdit?: () => void
  // Ciclo de vida — Regra 9: acessível no detalhe, sem entrar em edição.
  onInativar?: () => void
  onAtivar?: () => void
  onExcluir?: () => void  // fornecido só para platform_admin
}

type DetailTab = 'detalhes' | 'capacidades'

// ── helpers ───────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-[#e5e7eb]" />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
}

function ReadonlyField({ label, value, required }: { label: string; value?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-[#030712]">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="h-9 w-full rounded-md bg-[#f3f4f6] px-3 flex items-center">
        <span className="text-sm text-[#6b7280] truncate">{value || '—'}</span>
      </div>
    </div>
  )
}

function CopyButton({ text, onCopy }: { text: string; onCopy?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); onCopy?.() }}
      className="text-[#6b7280] hover:text-[#030712] transition-colors shrink-0"
      title="Copiar"
    >
      <Copy className="w-4 h-4" />
    </button>
  )
}

function StatusBadge({ status }: { status: Account['status'] }) {
  if (status === 'Ativo' || status === 'Criado') {
    return <Badge variant="success" showIcon>{status}</Badge>
  }
  return <Badge variant="secondary" showIcon>{status}</Badge>
}

/* ── main component ─────────────────────────────────────────── */

export function AccountDetailSheet({ open, onClose, account, org, onEdit, onInativar, onAtivar, onExcluir }: Props) {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const [tab, setTab] = useState<DetailTab>('detalhes')

  // ── Capacidades ──────────────────────────────────────────────
  const [activeCapabilities, setActiveCapabilities] = useState<string[]>([])
  const [loadingCaps, setLoadingCaps]   = useState(false)
  const [togglingCap, setTogglingCap]   = useState<string | null>(null)

  useEffect(() => {
    if (!open || !account) return
    let cancelled = false

    setTab('detalhes')
    setLoadingCaps(true)

    api.getEntitlements(account.id)
      .then((data: any[]) => {
        if (cancelled) return
        setActiveCapabilities(data.map((e: any) => e.capability))
        setLoadingCaps(false)
      })
      .catch(() => {
        if (!cancelled) {
          setActiveCapabilities(mockEntitlements[account.id] ?? [])
          setLoadingCaps(false)
        }
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account?.id])

  async function handleToggleCapability(capId: string) {
    if (!account || togglingCap) return
    const isActive = activeCapabilities.includes(capId)
    setActiveCapabilities(prev =>
      isActive ? prev.filter(c => c !== capId) : [...prev, capId]
    )
    setTogglingCap(capId)
    try {
      if (isActive) {
        await api.removeEntitlement(account.id, capId)
      } else {
        await api.addEntitlement(account.id, capId)
      }
    } catch { /* silencioso */ } finally {
      setTogglingCap(null)
    }
  }

  if (!account || !org) return null

  const accessUrl = buildTenantDomain(account.subdomain) ?? ''
  const hasSubdomain = !!accessUrl

  const enderecoPartes = [
    account.endereco || org.address,
    [account.cidade || org.city, account.estado || org.state].filter(Boolean).join(' - '),
  ].filter(Boolean)
  const enderecoFormatado = enderecoPartes.join(' | ')

  return (
    <>
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhes da Conta"
      width="w-[640px]"
      headerAction={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/contas/${account.id}/provisionamento`)}>
            Ver provisionamento
          </Button>
          {onEdit && <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>}
          {account.status === 'Inativo'
            ? onAtivar && <Button variant="outline" size="sm" className="text-green-700" onClick={onAtivar}>Ativar</Button>
            : <>
                {onInativar && <Button variant="outline" size="sm" className="text-amber-600" onClick={onInativar}>Inativar</Button>}
                {onExcluir && <Button variant="outline" size="sm" className="text-red-600" onClick={onExcluir}>Excluir</Button>}
              </>}
        </div>
      }
    >
      {/* ── Tabs ── */}
      <div className="flex border-b border-[#e5e7eb] -mx-6 px-6 mb-6">
        {(['detalhes', 'capacidades'] as DetailTab[]).map(t => (
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
            {t === 'detalhes' ? 'Detalhes' : (
              <>
                Licenças Ativas{' '}
                {!loadingCaps && (
                  <span className="ml-1 text-xs font-normal text-[#6b7280]">
                    ({activeCapabilities.length}/{CAPABILITIES.length})
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── Aba: Detalhes ── */}
      {tab === 'detalhes' && (
        <div className="flex flex-col gap-7">

          {/* Cabeçalho: logo + nome + status */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 border border-[#e5e7eb] flex items-center justify-center text-base font-bold text-gray-500 shrink-0 overflow-hidden">
              {account.logo
                ? <img src={account.logo} alt="" className="w-full h-full object-cover" />
                : <span>{account.name.charAt(0)}</span>
              }
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-base font-semibold text-[#030712] leading-6 truncate">{account.name}</p>
              <StatusBadge status={account.status} />
            </div>
          </div>

          {/* Favicon + Banner */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center overflow-hidden shrink-0">
                {account.logo
                  ? <img src={account.logo} alt="favicon" className="w-full h-full object-cover" />
                  : <span className="text-xs text-[#9ca3af]">—</span>
                }
              </div>
              <span className="text-sm font-medium text-[#030712]">Favicon</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center overflow-hidden shrink-0">
                {account.logo
                  ? <img src={account.logo} alt="banner" className="w-full h-full object-cover" />
                  : <span className="text-xs text-[#9ca3af]">—</span>
                }
              </div>
              <span className="text-sm font-medium text-[#030712]">Banner</span>
            </div>
          </div>

          <Divider />

          {/* Informações básicas */}
          <div className="flex flex-col gap-5">
            <SectionTitle>Informações básicas</SectionTitle>

            <ReadonlyField label="Nome" value={account.name} required />

            {/* URL de acesso */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-[#030712]">URL de acesso</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 h-9 rounded-md bg-[#f3f4f6] px-3">
                  <span className="text-sm text-[#030712] truncate flex-1">{accessUrl}</span>
                  <CopyButton text={accessUrl} onCopy={() => toast('URL copiada.', 'success')} />
                </div>
                {hasSubdomain ? (
                  <a
                    href={accessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 h-9 px-3 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] whitespace-nowrap transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#6b7280]" />
                    Acessar conta
                  </a>
                ) : (
                  <span
                    title="A URL de acesso ainda não está configurada para esta conta."
                    className="inline-flex items-center gap-1.5 h-9 px-3 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#9ca3af] bg-[#f9fafb] whitespace-nowrap shrink-0 cursor-not-allowed"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#d1d5db]" />
                    Acessar conta
                  </span>
                )}
              </div>
            </div>

            <ReadonlyField label="Razão social" value={account.razaoSocial || org.razaoSocial} required />
            <ReadonlyField label="Descrição" value={account.descricao} />
            <ReadonlyField label={account.tipoDocumento || org.docType || 'CNPJ'} value={account.numeroDocumento || org.docNumber} />
            <ReadonlyField label="Segmento de negócio" value={account.segmentoNegocio || org.businessSegment} />
            <ReadonlyField label="Data de cadastro" value={account.createdAt} />
            <ReadonlyField label="Site oficial" value={account.siteOficial || org.officialSite} required />
          </div>

          <Divider />

          {/* Endereço */}
          <div className="flex flex-col gap-3">
            <SectionTitle>Endereço</SectionTitle>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-[#030712]">Endereço postal</p>
              <p className="text-sm text-[#6b7280]">{enderecoFormatado || '—'}</p>
            </div>
          </div>

          <Divider />

          {/* Contatos */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Contatos</SectionTitle>
            {org.contacts.length === 0 ? (
              <p className="text-sm text-[#6b7280]">Nenhum contato cadastrado.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {org.contacts.map((c, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div>
                      <p className="text-base font-semibold text-[#030712] leading-6">{c.name}</p>
                      {c.role && <p className="text-sm text-[#6b7280] leading-5">{c.role}</p>}
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-3 border border-[#e5e7eb] rounded-xl px-4 py-3">
                        <MessageCircle className="w-4 h-4 text-[#030712] shrink-0" />
                        <span className="flex-1 text-sm text-[#030712] truncate">{c.phone}</span>
                        <CopyButton text={c.phone} />
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-3 border border-[#e5e7eb] rounded-xl px-4 py-3">
                        <Mail className="w-4 h-4 text-[#030712] shrink-0" />
                        <span className="flex-1 text-sm text-[#030712] truncate">{c.email}</span>
                        <CopyButton text={c.email} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Divider />

          {/* Usuários da conta */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Usuários da conta</SectionTitle>
            {(!account.admins || account.admins.length === 0) ? (
              <p className="text-sm text-[#9ca3af]">Nenhum usuário administrador cadastrado.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {account.admins.map((admin, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#030712]">{admin.nome} {admin.sobrenome}</p>
                      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2563eb] text-white">
                        Admin
                      </span>
                    </div>
                    <p className="text-sm text-[#6b7280]">{admin.email}</p>
                    <p className="text-sm text-[#9ca3af]">@{admin.usuario}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Aba: Licenças Ativas ── */}
      {tab === 'capacidades' && (
        <div className="flex flex-col gap-4">

          {/* Banner explicativo */}
          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Regra de decisão:</strong>{' '}
              <code className="bg-blue-100 px-1 rounded text-[11px]">allow = permission AND entitlement</code>
              <br />
              Habilitar uma licença <strong>não cria objetos</strong> — apenas libera a conta para recebê-los.
              É um pré-requisito: sem ela, nenhum acesso é liberado mesmo que a permissão exista.
              Os objetos são criados dentro do próprio produto (ex: MaxDoc) e refletidos automaticamente no cockpit.
            </p>
          </div>

          {loadingCaps ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Carregando licenças...
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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

    </Sheet>
    <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
