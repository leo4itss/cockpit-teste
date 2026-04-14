import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProvisioningDots } from '@/components/ProvisioningDots'
import { NewAccountSheet } from '@/components/NewAccountSheet'
import { NewSolutionSheet } from '@/components/NewSolutionSheet'
import { NewContractSheet } from '@/components/NewContractSheet'
import { NewOrganizationSheet } from '@/components/NewOrganizationSheet'
import { AccountDetailSheet } from '@/components/AccountDetailSheet'
import { EditAccountSheet } from '@/components/EditAccountSheet'
import { SolutionDetailSheet } from '@/components/SolutionDetailSheet'
import { EditSolutionSheet } from '@/components/EditSolutionSheet'
import { ContractDetailSheet } from '@/components/ContractDetailSheet'
import { api } from '@/api/client'
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getOrganization(id),
      api.getAccounts(id),
      api.getSolutions(id),
      api.getContracts(id),
      api.getTiposLicenca(),
      api.getComponentes(),
    ]).then(([orgData, accs, sols, conts, tipos, comps]) => {
      setOrg(orgData)
      setAccounts(accs)
      setSolutions(sols)
      setContracts(conts)
      setTiposLicenca(tipos)
      setComponentes(comps)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoadError('Falha ao carregar dados da organização.')
      setLoading(false)
    })
  }, [id])

  // Create sheets
  const [sheetAccount, setSheetAccount] = useState(false)
  const [sheetSolution, setSheetSolution] = useState(false)
  const [sheetContract, setSheetContract] = useState(false)
  const [sheetEditOrg, setSheetEditOrg] = useState(false)

  // Detail sheets
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null)
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null)
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)

  // Transição suave Detail → Edit — useRef/useCallback DEVEM ficar antes de qualquer early return
  const pendingEditAccount = useRef<Account | null>(null)
  const pendingEditSolution = useRef<Solution | null>(null)

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

  async function handleAddAccount(account: Omit<Account, 'id'>) {
    const saved = await api.createAccount({ ...account, id: crypto.randomUUID() })
    setAccounts(prev => [...prev, saved])
  }
  async function handleAddSolution(solution: Omit<Solution, 'id'>) {
    const saved = await api.createSolution({ ...solution, id: crypto.randomUUID() })
    setSolutions(prev => [...prev, saved])
  }
  async function handleAddContract(contract: Omit<Contract, 'id'>) {
    const saved = await api.createContract({ ...contract, id: crypto.randomUUID() })
    setContracts(prev => [...prev, saved])
  }
  async function handleEditOrg(data: Omit<Organization, 'id' | 'qtdContas' | 'qtdSolucoes' | 'qtdContratos' | 'contacts'>) {
    const saved = await api.updateOrganization(id!, { ...org, ...data })
    setOrg(saved)
  }
  async function handleSaveAccount(updated: Account) {
    const saved = await api.updateAccount(updated.id, updated)
    setAccounts(prev => prev.map(a => a.id === saved.id ? saved : a))
    setSelectedAccount(saved)
    setEditingAccount(null)
  }
  async function handleUpdateContacts(contacts: Contact[]) {
    const saved = await api.updateOrganization(id!, { ...org, contacts })
    setOrg(saved)
  }
  async function handleSaveSolution(updated: Solution) {
    const saved = await api.updateSolution(updated.id, updated)
    setSolutions(prev => prev.map(s => s.id === saved.id ? saved : s))
    setSelectedSolution(saved)
    setEditingSolution(null)
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
                    onChange={e => setShowDeleted(e.target.checked)}
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
                <div className="border border-[#e5e7eb] rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-white border-b border-[#e5e7eb]">
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Nome</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Provisionamento / Remoção</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Subdomínio</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Arquiteto PAS</th>
                        <th className="text-center px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map(a => (
                        <tr
                          key={a.id}
                          className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedAccount(a)}
                        >
                          <td className="px-2 py-2 h-[52px]">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center text-sm shrink-0">{a.name.charAt(0)}</div>
                              <span className="text-sm font-medium text-[#030712]">{a.name}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 h-[52px]">
                            <ProvisioningDots status={a.provisioningStatus} />
                          </td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{a.subdomain}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712] text-center">{a.arquitetoPAS}</td>
                          <td className="px-2 py-2 h-[52px] text-center">
                            <Badge variant="success">{a.status}</Badge>
                          </td>
                        </tr>
                      ))}
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
                <div className="border border-[#e5e7eb] rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-white border-b border-[#e5e7eb]">
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Nome da solução</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Planos</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Descrição</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Tipo</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Arquiteto PAS</th>
                        <th className="text-center px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solutions.map(s => (
                        <tr
                          key={s.id}
                          className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedSolution(s)}
                        >
                          <td className="px-2 py-2 h-[52px] text-sm font-medium text-[#030712]">{s.name}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{s.plans.map(p => p.name).join(', ')}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{s.description}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{s.type}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{s.arquitetoPAS}</td>
                          <td className="px-2 py-2 h-[52px] text-center">
                            <Badge variant="success">{s.status}</Badge>
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
                <div className="border border-[#e5e7eb] rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-white border-b border-[#e5e7eb]">
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Conta contratante</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Organização contratada</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Soluções</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Plano</th>
                        <th className="text-right px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Qtd contratada</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Data início</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Data término</th>
                        <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Renovação</th>
                        <th className="text-center px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map(c => (
                        <tr
                          key={c.id}
                          className="border-b border-[#e5e7eb] hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedContract(c)}
                        >
                          <td className="px-2 py-2 h-[52px] text-sm font-medium text-[#030712]">{c.contratante}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.orgContratada}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.solucoes}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.plano}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712] text-right">{c.qtdContratada}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.dataInicio}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.dataTermino}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{c.renovacao}</td>
                          <td className="px-2 py-2 h-[52px] text-center">
                            <Badge variant={c.status === 'Ativo' ? 'success' : c.status === 'Pendente' ? 'warning' : 'default'}>{c.status}</Badge>
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
      <NewContractSheet open={sheetContract} onClose={() => setSheetContract(false)} orgId={org.id} orgName={org.name} solutions={solutions} onSave={handleAddContract} />
      <NewOrganizationSheet open={sheetEditOrg} onClose={() => setSheetEditOrg(false)} onSave={handleEditOrg} />

      {/* Detail sheets */}
      <AccountDetailSheet
        open={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        account={selectedAccount}
        org={org}
        onEdit={() => selectedAccount && handleEditAccountFromDetail(selectedAccount)}
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
      />
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
