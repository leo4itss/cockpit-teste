import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProvisioningDots } from '@/components/ProvisioningDots'
import { NewAccountSheet } from '@/components/NewAccountSheet'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { NewSolutionSheet } from '@/components/NewSolutionSheet'
import { NewContractSheet } from '@/components/NewContractSheet'
import { NewOrganizationSheet } from '@/components/NewOrganizationSheet'
import { AccountDetailSheet } from '@/components/AccountDetailSheet'
import { EditAccountSheet } from '@/components/EditAccountSheet'
import { SolutionDetailSheet } from '@/components/SolutionDetailSheet'
import { EditSolutionSheet } from '@/components/EditSolutionSheet'
import { ContractDetailSheet } from '@/components/ContractDetailSheet'
import { EditContractSheet } from '@/components/EditContractSheet'
import { api } from '@/api/client'
import {
  organizations as mockOrgs,
  accounts as mockAccounts,
  solutions as mockSolutions,
  contracts as mockContracts,
  tiposLicenca as mockTiposLicenca,
  componentes as mockComponentes,
} from '@/data/mock'
import type { Account, Solution, Contract, Organization, Contact, TipoLicenca, Componente } from '@/types'

type Tab = 'conta' | 'solucoes' | 'contrato' | 'marketplace'

export function OrganizacaoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('conta')
  const [org, setOrg] = useState<Organization | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [tiposLicenca, setTiposLicenca] = useState<TipoLicenca[]>([])
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError] = useState<string | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)

  useEffect(() => {
    if (!id) return

    // Separa as chamadas críticas (org + dados relacionados) das auxiliares
    // (tipos-licenca e componentes) para que a falha de uma não derrube tudo.
    // Em previews antigos que não têm esses endpoints, a org ainda carrega.
    Promise.all([
      api.getOrganization(id),
      api.getAccounts(id),
      api.getSolutions(id),
      api.getContracts(id),
    ]).then(async ([orgData, accs, sols, conts]) => {
      setOrg(orgData)
      setAccounts(accs)
      setSolutions(sols)
      setContracts(conts)

      // Carrega auxiliares de forma independente — falha silenciosa
      const [tipos, comps] = await Promise.all([
        api.getTiposLicenca().catch(() => mockTiposLicenca),
        api.getComponentes().catch(() => mockComponentes),
      ])
      setTiposLicenca(tipos)
      setComponentes(comps)
      setLoading(false)
    }).catch(() => {
      // API indisponível — usa mock data como fallback
      const mockOrg = mockOrgs.find(o => o.id === id) ?? null
      setOrg(mockOrg)
      setAccounts(mockAccounts.filter(a => a.orgId === id))
      setSolutions(mockSolutions.filter(s => s.orgId === id))
      setContracts(mockContracts.filter(c => c.orgId === id))
      setTiposLicenca(mockTiposLicenca)
      setComponentes(mockComponentes)
      setLoading(false)
    })
  }, [id])

  // Create sheets
  const [sheetAccount, setSheetAccount] = useState(false)
  const [sheetSolution, setSheetSolution] = useState(false)
  const [sheetContract, setSheetContract] = useState(false)
  const [sheetEditOrg, setSheetEditOrg] = useState(false)

  // Delete org modal
  const [orgDeleteModal, setOrgDeleteModal] = useState<'org' | 'blocked' | null>(null)
  const [orgBlockedInfo, setOrgBlockedInfo] = useState<{ activeAccounts: number; activeContracts: number } | null>(null)

  // Delete account modal
  const [accountDeleteTarget, setAccountDeleteTarget] = useState<Account | null>(null)
  const [accountDeleteModal, setAccountDeleteModal] = useState<'confirm' | 'blocked' | null>(null)
  const [accountBlockedContracts, setAccountBlockedContracts] = useState(0)

  // Delete contract modal
  const [contractDeleteTarget, setContractDeleteTarget] = useState<Contract | null>(null)

  // Detail sheets
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null)
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)

  // Transição suave Detail → Edit — useRef/useCallback DEVEM ficar antes de qualquer early return
  const pendingEditAccount = useRef<Account | null>(null)
  const pendingEditSolution = useRef<Solution | null>(null)
  const pendingEditContract = useRef<Contract | null>(null)

  const handleEditAccountFromDetail = useCallback((account: Account) => {
    pendingEditAccount.current = account
    setSelectedAccount(null)
    setTimeout(() => {
      setEditingAccount(pendingEditAccount.current)
      pendingEditAccount.current = null
    }, 340)
  }, [])

  const handleEditSolutionFromDetail = useCallback((solution: Solution) => {
    pendingEditSolution.current = solution
    setSelectedSolution(null)
    setTimeout(() => {
      setEditingSolution(pendingEditSolution.current)
      pendingEditSolution.current = null
    }, 340)
  }, [])

  const handleEditContractFromDetail = useCallback((contract: Contract) => {
    pendingEditContract.current = contract
    setSelectedContract(null)
    setTimeout(() => {
      setEditingContract(pendingEditContract.current)
      pendingEditContract.current = null
    }, 340)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full p-6">
      <p className="text-sm text-gray-500">Carregando...</p>
    </div>
  )

  if (loadError) return (
    <div className="p-6">
      <button onClick={() => navigate('/organizacoes')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        Voltar
      </button>
      <p className="text-sm text-red-500">{loadError}</p>
    </div>
  )

  if (!org) return (
    <div className="p-6">
      <button onClick={() => navigate('/organizacoes')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        Voltar
      </button>
      <p className="text-gray-500">Organização não encontrada.</p>
    </div>
  )

  // Tenta a API; se falhar (sem backend/sem .env), cai no fallback local
  async function handleAddAccount(account: Omit<Account, 'id'>) {
    const local: Account = { ...account, id: crypto.randomUUID() }
    try {
      const saved = await api.createAccount(local)
      setAccounts(prev => [...prev, saved])
    } catch {
      setAccounts(prev => [...prev, local])
    }
  }
  async function handleAddSolution(solution: Omit<Solution, 'id'>) {
    const local: Solution = { ...solution, id: crypto.randomUUID() }
    try {
      const saved = await api.createSolution(local)
      setSolutions(prev => [...prev, saved])
    } catch {
      setSolutions(prev => [...prev, local])
    }
  }
  async function handleAddContract(contract: Omit<Contract, 'id'>) {
    const local: Contract = { ...contract, id: crypto.randomUUID() }
    try {
      const saved = await api.createContract(local)
      setContracts(prev => [...prev, saved])
    } catch {
      setContracts(prev => [...prev, local])
    }
  }
  async function handleEditOrg(data: Omit<Organization, 'id' | 'qtdContas' | 'qtdSolucoes' | 'qtdContratos' | 'contacts'>) {
    try {
      const saved = await api.updateOrganization(id!, { ...org, ...data })
      setOrg(saved)
    } catch {
      setOrg(prev => prev ? { ...prev, ...data } : prev)
    }
  }
  async function handleSaveAccount(updated: Account) {
    try {
      const saved = await api.updateAccount(updated.id, updated)
      setAccounts(prev => prev.map(a => a.id === saved.id ? saved : a))
      setSelectedAccount(saved)
    } catch {
      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))
      setSelectedAccount(updated)
    }
    setEditingAccount(null)
  }
  async function handleUpdateContacts(contacts: Contact[]) {
    try {
      const saved = await api.updateOrganization(id!, { ...org, contacts })
      setOrg(saved)
    } catch {
      setOrg(prev => prev ? { ...prev, contacts } : prev)
    }
  }
  async function handleSaveSolution(updated: Solution) {
    try {
      const saved = await api.updateSolution(updated.id, updated)
      setSolutions(prev => prev.map(s => s.id === saved.id ? saved : s))
      setSelectedSolution(saved)
    } catch {
      setSolutions(prev => prev.map(s => s.id === updated.id ? updated : s))
      setSelectedSolution(updated)
    }
    setEditingSolution(null)
  }
  async function handleSaveContract(updated: Contract) {
    try {
      const saved = await api.updateContract(updated.id, updated)
      setContracts(prev => prev.map(c => c.id === saved.id ? saved : c))
      setSelectedContract(saved)
    } catch {
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
      setSelectedContract(updated)
    }
    setEditingContract(null)
  }

  async function handleDeleteOrg() {
    try {
      await api.deleteOrganization(org!.id)
      navigate('/organizacoes')
    } catch {
      const res = await fetch(`/api/organizations/${org!.id}`, { method: 'DELETE' })
      if (res.status === 422) {
        const body = await res.json()
        setOrgBlockedInfo({ activeAccounts: body.activeAccounts, activeContracts: body.activeContracts })
        setOrgDeleteModal('blocked')
      }
    }
  }

  // Verifica dependências e abre o modal correto (confirm ou blocked)
  function requestDeleteAccount(account: Account) {
    const activeContracts = contracts.filter(
      c => c.contratante === account.name && c.status === 'Ativo'
    ).length
    setAccountDeleteTarget(account)
    if (activeContracts > 0) {
      setAccountBlockedContracts(activeContracts)
      setAccountDeleteModal('blocked')
    } else {
      setAccountDeleteModal('confirm')
    }
  }

  function closeAccountDeleteModal() {
    setAccountDeleteModal(null)
    setAccountDeleteTarget(null)
  }

  async function handleDeleteAccount(account: Account) {
    try {
      await api.deleteAccount(account.id)
      if (showDeleted) {
        setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, deletedAt: new Date().toISOString() } : a))
      } else {
        setAccounts(prev => prev.filter(a => a.id !== account.id))
      }
    } catch {
      // silencioso
    }
    closeAccountDeleteModal()
  }

  async function handleDeleteContract() {
    if (!contractDeleteTarget) return
    try {
      await api.deleteContract(contractDeleteTarget.id)
      setContracts(prev => prev.filter(c => c.id !== contractDeleteTarget.id))
    } catch {
      // silencioso
    }
    setContractDeleteTarget(null)
    setEditingContract(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conta', label: 'Conta' },
    { key: 'solucoes', label: 'Soluções e planos' },
    { key: 'contrato', label: 'Contrato' },
  ]

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left sidebar - org details */}
      <aside className="w-[358px] shrink-0 border-r border-[#e5e7eb] bg-white flex flex-col overflow-hidden">
        {/* Fixed header: logo + edit button */}
        <div className="shrink-0 px-6 pt-6 pb-6 border-b border-[#e5e7eb]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-base font-semibold text-[#6b7280] shrink-0">
                {org.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[#6b7280] leading-5">Organização</p>
                <p className="text-base font-medium text-[#030712] leading-6 truncate">{org.name}</p>
              </div>
            </div>
            <button
              onClick={() => setSheetEditOrg(true)}
              className="text-sm font-medium text-[#030712] bg-white border border-[#e5e7eb] rounded-md px-4 py-2 h-9 shrink-0 ml-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors"
            >
              Editar
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-14 pt-6 flex flex-col gap-7">

          {/* Informações básicas */}
          <FieldGroup title="Informações básicas">
            <Field label="Nome da organização" value={org.name} />
            <Field label="Razão Social" value={org.razaoSocial} />
            <Field label="CNPJ" value={org.docNumber} />
            <Field label="Segmento de atuação" value={org.businessSegment} />
            <Field label="Data de cadastro" value={org.createdAt} />
            <Field label="Site oficial" value={org.officialSite} />
          </FieldGroup>

          <hr className="border-[#e5e7eb]" />

          {/* Endereço */}
          <FieldGroup title="Endereço">
            <div className="text-sm text-[#6b7280]">
              {`${org.address}${org.city ? ` · ${org.city}` : ''}${org.state ? ' · ' + org.state : ''}`}
            </div>
          </FieldGroup>

          <hr className="border-[#e5e7eb]" />

          {/* Contatos */}
          {org.contacts.length > 0 && (
            <>
              <FieldGroup title="Contatos">
                {org.contacts.map((c, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div>
                      <p className="text-sm font-medium leading-none text-[#030712]">{c.name}</p>
                      <p className="text-sm text-[#6b7280] leading-5 mt-1">{c.role}</p>
                    </div>
                    <div className="border border-[#e5e7eb] rounded-md px-4 py-3 flex items-center gap-2.5">
                      <Phone className="w-5 h-5 text-[#6b7280] shrink-0" />
                      <span className="flex-1 text-sm font-medium text-[#6b7280]">{c.phone}</span>
                      <button className="text-[#6b7280] hover:text-[#030712] transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="border border-[#e5e7eb] rounded-md px-4 py-3 flex items-center gap-2.5">
                      <Mail className="w-5 h-5 text-[#6b7280] shrink-0" />
                      <span className="flex-1 text-sm font-medium text-[#6b7280] truncate">{c.email}</span>
                      <button className="text-[#6b7280] hover:text-[#030712] transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </FieldGroup>

              <hr className="border-[#e5e7eb]" />
            </>
          )}

          {/* Configuração PAS */}
          <FieldGroup title="Configuração PAS">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[#030712]">Arquiteto PAS</p>
              <p className="text-sm text-[#6b7280]">{org.arquitetoPAS}</p>
            </div>
            <Field label="Subdomínio" value={org.domain} />
          </FieldGroup>

          <hr className="border-[#e5e7eb]" />

          {/* Organizações vinculadas */}
          <FieldGroup title="Organizações vinculadas">
            <p className="text-sm font-medium text-[#030712]">Não há organizações vinculadas</p>
          </FieldGroup>

        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tab navigation + page header */}
        <div className="border-b border-[#e5e7eb] bg-white shrink-0">
          {/* Tabs */}
          <div className="border-b border-[#e5e7eb] px-3">
            <nav className="flex">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-2.5 py-3 text-sm transition-colors border-b-2 ${
                    tab === t.key
                      ? 'font-semibold text-[#030712] border-[#2563eb]'
                      : 'font-normal text-[#6b7280] border-transparent hover:text-[#030712]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Page header */}
          <div className="flex items-center justify-between px-6 py-6">
            <div className="flex flex-col gap-2 max-w-[720px]">
              <h2 className="text-[30px] font-bold leading-9 text-[#030712] tracking-normal">
                {tab === 'conta' ? 'Conta'
                  : tab === 'solucoes' ? 'Soluções e planos'
                  : tab === 'contrato' ? 'Contrato'
                  : 'Marketplace'}
              </h2>
              <p className="text-base text-[#6b7280] leading-6">
                {tab === 'conta' ? 'Descrição da conta.'
                  : tab === 'solucoes' ? 'Descrição de solução e plano'
                  : tab === 'contrato' ? 'Descrição de contrato.'
                  : 'Esta funcionalidade estará disponível em breve.'}
              </p>
            </div>
            <div className="flex items-center gap-8 shrink-0">
              {tab === 'conta' && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={async e => {
                      const val = e.target.checked
                      setShowDeleted(val)
                      if (id) {
                        try {
                          const accs = await api.getAccounts(id, val)
                          setAccounts(accs)
                        } catch {}
                      }
                    }}
                    className="w-4 h-4 mt-[1px] rounded border border-[#e5e7eb] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] shrink-0 accent-[#2563eb] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-[#030712] leading-none">Exibir contas deletadas</span>
                </label>
              )}
              {tab !== 'marketplace' && (
                <Button onClick={() => {
                  if (tab === 'conta') setSheetAccount(true)
                  else if (tab === 'solucoes') setSheetSolution(true)
                  else if (tab === 'contrato') setSheetContract(true)
                }}>Criar</Button>
              )}
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-8">

          {/* CONTA TAB */}
          {tab === 'conta' && (
            <>
              {accounts.length === 0 ? (
                <EmptyState message="Nenhuma conta criada" description="Crie uma conta para provisionar o sistema." />
              ) : (
                <div className="border border-[#e5e7eb] rounded-2xl p-4 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[184px]">Nome</th>
                        <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[169px] leading-snug">Provisionamento / Remoção</th>
                        <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10">Subdomínio</th>
                        <th className="text-center px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[120px]">Arquiteto PAS</th>
                        <th className="text-center px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[131px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map(a => {
                        const isDeleted = !!a.deletedAt
                        const exclusaoPermanente = isDeleted
                          ? new Date(new Date(a.deletedAt!).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
                          : null
                        return (
                          <tr
                            key={a.id}
                            className={`group border-b border-[#e5e7eb] transition-colors ${isDeleted ? 'bg-red-50/40' : 'hover:bg-gray-50 cursor-pointer'}`}
                            onClick={() => !isDeleted && setSelectedAccount(a)}
                          >
                            <td className="px-2 py-2 h-[52px]">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-sm font-medium text-[#6b7280] shrink-0 ${isDeleted ? 'opacity-40' : ''}`}>{a.name.charAt(0)}</div>
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-sm font-medium ${isDeleted ? 'text-[#9ca3af] line-through' : 'text-[#030712]'}`}>{a.name}</span>
                                  {isDeleted && exclusaoPermanente && (
                                    <span className="text-xs text-red-500 leading-none mt-0.5">Exclusão em {exclusaoPermanente}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2 h-[52px]">
                              {isDeleted ? <span className="text-xs text-[#9ca3af]">—</span> : <ProvisioningDots status={a.provisioningStatus} />}
                            </td>
                            <td className={`px-2 py-2 h-[52px] text-sm ${isDeleted ? 'text-[#9ca3af]' : 'text-[#030712]'}`}>{a.subdomain}</td>
                            <td className={`px-2 py-2 h-[52px] text-sm text-center ${isDeleted ? 'text-[#9ca3af]' : 'text-[#030712]'}`}>{a.arquitetoPAS}</td>
                            <td className="px-2 py-2 h-[52px] text-center">
                              {isDeleted
                                ? <Badge variant="error">Em exclusão</Badge>
                                : <Badge variant="success" showIcon>{a.status}</Badge>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* SOLUÇÕES TAB */}
          {tab === 'solucoes' && (
            <>
              {solutions.length === 0 ? (
                <EmptyState message="Nenhuma solução criada" description="Crie uma solução e associe planos a ela." />
              ) : (
                <div className="border border-[#e5e7eb] rounded-2xl overflow-x-auto p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        {/* Nome da solução — 183px */}
                        <th className="text-left px-2 py-2.5 font-medium text-[#030712] opacity-40 h-10 w-[183px]">Nome da solução</th>
                        {/* Planos — 85px */}
                        <th className="text-left px-2 py-2.5 font-medium text-[#030712] opacity-40 h-10 w-[85px]">Planos</th>
                        {/* Descrição — 169px */}
                        <th className="text-left px-2 py-2.5 font-medium text-[#030712] opacity-40 h-10 w-[169px]">Descrição</th>
                        {/* Componentes — 133px */}
                        <th className="text-left px-2 py-2.5 font-medium text-[#030712] opacity-40 h-10 w-[133px]">Componentes</th>
                        {/* Marketplace — 153px */}
                        <th className="text-left px-2 py-2.5 font-medium text-[#030712] opacity-40 h-10 w-[153px]">Marketplace</th>
                        {/* Arquiteto PAS — 120px, centralizado */}
                        <th className="text-center px-2 py-2.5 font-medium text-[#030712] opacity-40 h-10 w-[120px]">Arquiteto PAS</th>
                        {/* Status — 131px, centralizado */}
                        <th className="text-center px-2 py-2.5 font-medium text-[#030712] opacity-40 h-10 w-[131px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solutions.map(s => (
                        <tr
                          key={s.id}
                          className="border-b border-[#e5e7eb] last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedSolution(s)}
                        >
                          {/* Nome + avatar */}
                          <td className="px-2 py-2 h-[52px] w-[183px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#f3f4f6] shrink-0 overflow-hidden border border-[#e5e7eb] flex items-center justify-center">
                                <span className="text-xs font-medium text-[#6b7280]">
                                  {s.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-[#030712] truncate">{s.name}</span>
                            </div>
                          </td>
                          {/* Planos — count */}
                          <td className="px-2 py-2 h-[52px] w-[85px] text-sm text-[#030712]">
                            {s.plans.length}
                          </td>
                          {/* Descrição — truncada */}
                          <td className="px-2 py-2 h-[52px] w-[169px] max-w-[169px]">
                            <span className="text-sm text-[#030712] block truncate whitespace-nowrap overflow-hidden">{s.description || '—'}</span>
                          </td>
                          {/* Componentes — count numérico */}
                          <td className="px-2 py-2 h-[52px] w-[133px] text-sm text-[#030712]">
                            {(s.componenteIds ?? []).length > 0
                              ? (s.componenteIds ?? []).length
                              : <span className="text-[#9ca3af]">—</span>
                            }
                          </td>
                          {/* Marketplace — badge */}
                          <td className="px-2 py-2 h-[52px] w-[153px]">
                            {s.marketplace
                              ? <Badge variant="success" showIcon>{s.marketplace}</Badge>
                              : <span className="text-sm text-[#9ca3af]">—</span>
                            }
                          </td>
                          {/* Arquiteto PAS — centralizado */}
                          <td className="px-2 py-2 h-[52px] w-[120px] text-sm text-[#030712] text-center">
                            {s.arquitetoPAS || '—'}
                          </td>
                          {/* Status — badge centralizado */}
                          <td className="px-2 py-2 h-[52px] w-[131px] text-center">
                            <Badge
                              variant={s.status === 'Ativo' ? 'success' : 'default'}
                              showIcon={s.status === 'Ativo'}
                            >
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* CONTRATO TAB */}
          {tab === 'contrato' && (
            <>
              {contracts.length === 0 ? (
                <EmptyState message="Nenhum contrato criado" description="Crie um contrato para esta organização." />
              ) : (
                <div className="border border-[#e5e7eb] rounded-2xl p-4 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="text-left px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[184px]">Conta contratante</th>
                        <th className="text-left px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10">Organização contratada</th>
                        <th className="text-left px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[169px]">Soluções</th>
                        <th className="text-left px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[85px]">Plano</th>
                        <th className="text-left px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[90px] leading-snug">Qtd contratada</th>
                        <th className="text-right px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[109px]">Data início</th>
                        <th className="text-right px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[109px]">Data término</th>
                        <th className="text-center px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[120px]">Renovação</th>
                        <th className="text-center px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[131px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map(c => (
                        <tr
                          key={c.id}
                          className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedContract(c)}
                        >
                          {/* Conta contratante — avatar + nome */}
                          <td className="px-2 py-2 h-[52px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-sm font-medium text-[#6b7280] shrink-0">
                                {c.contratante.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-[#030712] truncate">{c.contratante}</span>
                            </div>
                          </td>
                          {/* Organização contratada */}
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712] truncate max-w-0">
                            <span className="block truncate">{c.objetos[0]?.orgContratada ?? '—'}</span>
                          </td>
                          {/* Soluções */}
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712] w-[169px]">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{c.objetos[0]?.solucao ?? '—'}</span>
                              {c.objetos.length > 1 && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">+{c.objetos.length - 1}</span>
                              )}
                            </div>
                          </td>
                          {/* Plano */}
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.objetos[0]?.plano ?? '—'}</td>
                          {/* Qtd contratada */}
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.objetos[0]?.qtdContratada ?? '—'}</td>
                          {/* Datas */}
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.dataInicio}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.dataTermino}</td>
                          {/* Renovação */}
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712] text-center">{c.renovacao}</td>
                          {/* Status */}
                          <td className="px-2 py-2 h-[52px] text-center">
                            <Badge
                              variant={c.status === 'Ativo' ? 'success' : c.status === 'Pendente' ? 'warning' : 'default'}
                              showIcon={c.status === 'Ativo'}
                            >
                              {c.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* MARKETPLACE TAB */}
          {tab === 'marketplace' && (
            <EmptyState message="Marketplace em breve" description="Esta funcionalidade estará disponível em breve." />
          )}

        </div>
      </div>

      {/* Delete modals */}
      <ConfirmDeleteModal
        open={orgDeleteModal === 'org'}
        onClose={() => setOrgDeleteModal(null)}
        variant="org"
        name={org?.name ?? ''}
        onConfirm={handleDeleteOrg}
      />
      <ConfirmDeleteModal
        open={orgDeleteModal === 'blocked'}
        onClose={() => setOrgDeleteModal(null)}
        variant="blocked"
        name={org?.name ?? ''}
        blocked={orgBlockedInfo ?? undefined}
      />
      <ConfirmDeleteModal
        open={accountDeleteModal === 'confirm'}
        onClose={closeAccountDeleteModal}
        variant="account"
        name={accountDeleteTarget?.name ?? ''}
        onConfirm={() => accountDeleteTarget && handleDeleteAccount(accountDeleteTarget)}
      />
      <ConfirmDeleteModal
        open={accountDeleteModal === 'blocked'}
        onClose={closeAccountDeleteModal}
        variant="blocked"
        name={accountDeleteTarget?.name ?? ''}
        blocked={{ activeAccounts: 0, activeContracts: accountBlockedContracts }}
        blockedTitle="Não é possível excluir esta conta"
      />

      <ConfirmDeleteModal
        open={!!contractDeleteTarget}
        onClose={() => setContractDeleteTarget(null)}
        variant="contract"
        name={contractDeleteTarget?.contratante ?? ''}
        onConfirm={handleDeleteContract}
      />

      {/* Create sheets */}
      <NewAccountSheet open={sheetAccount} onClose={() => setSheetAccount(false)} orgId={org.id} onSave={handleAddAccount} />
      <NewSolutionSheet
        open={sheetSolution}
        onClose={() => setSheetSolution(false)}
        orgId={org.id}
        onSave={handleAddSolution}
        tiposLicenca={tiposLicenca}
        componentes={componentes}
        onComponenteCreated={c => setComponentes(prev => [...prev, c])}
      />
      <NewContractSheet open={sheetContract} onClose={() => setSheetContract(false)} orgId={org.id} orgName={org.name} accounts={accounts} solutions={solutions} onSave={handleAddContract} />
      <NewOrganizationSheet
        open={sheetEditOrg}
        onClose={() => setSheetEditOrg(false)}
        onSave={handleEditOrg}
        onDelete={() => { setSheetEditOrg(false); setOrgDeleteModal('org') }}
      />

      {/* Detail sheets */}
      <AccountDetailSheet
        open={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        account={selectedAccount}
        org={org}
        onEdit={() => selectedAccount && handleEditAccountFromDetail(selectedAccount)}
        onDelete={account => {
          setSelectedAccount(null)
          setTimeout(() => requestDeleteAccount(account), 340)
        }}
      />
      {editingAccount && (
        <EditAccountSheet
          key={editingAccount.id}
          open={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          account={editingAccount}
          org={org}
          onSave={handleSaveAccount}
          onUpdateContacts={handleUpdateContacts}
        />
      )}
      <SolutionDetailSheet
        open={!!selectedSolution}
        onClose={() => setSelectedSolution(null)}
        solution={selectedSolution}
        componentes={componentes}
        onEdit={() => selectedSolution && handleEditSolutionFromDetail(selectedSolution)}
      />
      {editingSolution && (
        <EditSolutionSheet
          key={editingSolution.id}
          open={!!editingSolution}
          onClose={() => setEditingSolution(null)}
          solution={editingSolution}
          onSave={handleSaveSolution}
          tiposLicenca={tiposLicenca}
          componentes={componentes}
          onComponenteCreated={c => setComponentes(prev => [...prev, c])}
        />
      )}
      <ContractDetailSheet
        open={!!selectedContract}
        onClose={() => setSelectedContract(null)}
        contract={selectedContract}
        onEdit={() => selectedContract && handleEditContractFromDetail(selectedContract)}
      />
      {editingContract && (
        <EditContractSheet
          key={editingContract.id}
          open={!!editingContract}
          onClose={() => setEditingContract(null)}
          contract={editingContract}
          solutions={solutions}
          onSave={handleSaveContract}
          onDelete={() => {
            setContractDeleteTarget(editingContract)
            setEditingContract(null)
          }}
        />
      )}
    </div>
  )
}

/* ── helpers ───────────────────────────────────────────── */

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col items-start">
        <div className="pb-3 w-full">
          <p className="text-base font-bold leading-6 text-[#030712]">{title}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 w-full">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-[#030712]">{label}</p>
      <p className="text-sm text-[#6b7280] px-3 py-1">{value || '—'}</p>
    </div>
  )
}

function EmptyState({ message, description }: { message: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2">
      <p className="text-sm font-medium text-gray-600">{message}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  )
}
