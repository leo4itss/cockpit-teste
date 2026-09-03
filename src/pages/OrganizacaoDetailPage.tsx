import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Copy, Phone, Mail, RotateCcw, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/Badge'
import { ProvisioningDots } from '@/components/ProvisioningDots'
import { ContractStatusBadge } from '@/components/ContractStatusBadge'
import { NewAccountSheet } from '@/components/NewAccountSheet'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { NewSolutionSheet } from '@/components/NewSolutionSheet'
import { NewContractSheet } from '@/components/NewContractSheet'
import { EditOrganizationSheet } from '@/components/EditOrganizationSheet'
import { AccountDetailSheet } from '@/components/AccountDetailSheet'
import { EditAccountSheet } from '@/components/EditAccountSheet'
import { SolutionDetailSheet } from '@/components/SolutionDetailSheet'
import { EditSolutionSheet } from '@/components/EditSolutionSheet'
import { ContractDetailSheet } from '@/components/ContractDetailSheet'
import { EditContractSheet } from '@/components/EditContractSheet'
import { CriarUsuarioSheet } from '@/components/usuarios/CriarUsuarioSheet'
import { UsuarioDetailOrgSheet, type ContaVinculada } from '@/components/usuarios/UsuarioDetailOrgSheet'
import { api } from '@/api/client'
import { useAuthz, useIsPlatformAdmin, useIsOrgAdmin, useIsPasArchitect } from '@/authz/hooks'
import { useComponentes } from '@/context/ComponentesContext'
import { useProvisioningPolling } from '@/hooks/useProvisioningPolling'
import { formatarData, previsaoExclusaoPermanente } from '@/lib/datas'
import {
  podeInativarConta,
  podeInativarOrganizacao,
  podeExcluirOrganizacao,
  podeExcluirConta,
  podeExcluirSolucao,
  type Impedimento,
} from '@/lib/regrasCicloVida'
import {
  startContractProvisioning,
  getContractProvisioning,
  deriveContractStatus,
} from '@/services/provisioning'
import {
  organizations as mockOrgs,
  accounts as mockAccounts,
  solutions as mockSolutions,
  contracts as mockContracts,
  tiposLicenca as mockTiposLicenca,
  users as mockUsers,
  accountMembrosIds as mockAccountMembrosIds,
} from '@/data/mock'
import type { Account, Solution, Contract, Organization, Contact, TipoLicenca, User, ProvisioningOverallStatus } from '@/types'

type Tab = 'conta' | 'solucoes' | 'contrato' | 'marketplace' | 'usuarios'

export function OrganizacaoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const { relations } = useAuthz()
  const isPlatformAdmin = useIsPlatformAdmin()
  const isOrgAdmin = useIsOrgAdmin()
  const isPasArchitect = useIsPasArchitect()
  const [tab, setTab] = useState<Tab>('conta')
  const [org, setOrg] = useState<Organization | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  // Contas em quarentena (soft delete). Mantidas FORA de `accounts` de propósito:
  // treze consumidores desse array assumem contas vivas (métricas, seletor de
  // contratante, vínculo de usuário…). Só a listagem e a regra de exclusão da
  // organização enxergam as excluídas.
  const [accountsExcluidas, setAccountsExcluidas] = useState<Account[]>([])
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [tiposLicenca, setTiposLicenca] = useState<TipoLicenca[]>([])
  const { componentes } = useComponentes()
  const [loading, setLoading] = useState(true)
  const [loadError] = useState<string | null>(null)
  const [showInativas, setShowInativas] = useState(false)
  const [showInativosContract, setShowInativosContract] = useState(false)

  useEffect(() => {
    if (!id) return

    // ── Passo 1: exibe mock local IMEDIATAMENTE (loading=false instantâneo) ──
    // A página nunca fica em branco — o usuário vê dados reais ou de demonstração
    // em menos de 1ms, e os dados reais substituem quando a API responder.
    setOrg(mockOrgs.find(o => o.id === id) ?? null)
    const mockDaOrg = mockAccounts.filter(a => a.orgId === id)
    setAccounts(mockDaOrg.filter(a => !a.deletedAt))
    setAccountsExcluidas(mockDaOrg.filter(a => a.deletedAt))
    setSolutions(mockSolutions.filter(s => s.orgId === id))
    setContracts(mockContracts.filter(c => c.orgId === id))
    setTiposLicenca(mockTiposLicenca)
    setLoading(false)

    // ── Passo 2: tenta API em background; atualiza silenciosamente se vier ──
    Promise.allSettled([
      api.getOrganization(id),
      api.getAccounts(id, true),
      api.getSolutions(id),
      api.getContracts(id),
      api.getTiposLicenca(),
    ]).then(([orgRes, accsRes, solsRes, contsRes, tiposRes]) => {
      if (orgRes.status   === 'fulfilled' && orgRes.value)   setOrg(orgRes.value)
      if (accsRes.status  === 'fulfilled') {
        setAccounts(accsRes.value.filter((a: Account) => !a.deletedAt))
        setAccountsExcluidas(accsRes.value.filter((a: Account) => a.deletedAt))
      }
      if (solsRes.status  === 'fulfilled')                   setSolutions(solsRes.value)
      if (contsRes.status === 'fulfilled')                   setContracts(contsRes.value)
      if (tiposRes.status === 'fulfilled')                   setTiposLicenca(tiposRes.value)
    })
  }, [id])

  // Métricas + lista de usuários da org
  const [userCount, setUserCount]           = useState(0)
  const [orgUsers, setOrgUsers]             = useState<User[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [showCriarUsuario, setShowCriarUsuario] = useState(false)
  const [selectedOrgUser, setSelectedOrgUser] = useState<User | null>(null)
  const [showOrgUserDetail, setShowOrgUserDetail] = useState(false)
  const [userAccountsMap, setUserAccountsMap] = useState<Record<string, ContaVinculada[]>>({})
  useEffect(() => {
    // Mock imediato (mesma estratégia dos demais dados desta tela) — sem isso,
    // rodando sem backend, a aba Usuários e a regra de exclusão de conta por
    // usuário vinculado (hipótese 3) não teriam dados.
    setUserCount(mockUsers.length)
    setOrgUsers(mockUsers)
    setLoadingMetrics(false)
    api.getUsers()
      .then((users: User[]) => {
        setUserCount(users.length)
        setOrgUsers(users)
        setLoadingMetrics(false)
      })
      .catch(() => {})
  }, [])

  // Carrega membros por conta para montar userAccountsMap (necessário para
  // UsuarioDetailOrgSheet e para a regra de exclusão de conta).
  useEffect(() => {
    if (accounts.length === 0) return

    // Fallback local a partir de accountMembrosIds — usado quando a API não responde.
    const mapaMock = (): Record<string, ContaVinculada[]> => {
      const map: Record<string, ContaVinculada[]> = {}
      for (const acc of accounts) {
        for (const userId of mockAccountMembrosIds[acc.id] ?? []) {
          ;(map[userId] ??= []).push({ account: acc, papel: 'member' })
        }
      }
      return map
    }
    setUserAccountsMap(mapaMock())

    Promise.all(
      accounts.map(acc =>
        api.getAccountMembros(acc.id)
          .then((mems: any[]) => ({ acc, mems, ok: true as const }))
          .catch(() => ({ acc, mems: [] as any[], ok: false as const }))
      )
    ).then(results => {
      // Se NENHUMA chamada respondeu, mantém o fallback local.
      if (results.every(r => !r.ok)) return
      const map: Record<string, ContaVinculada[]> = {}
      results.forEach(({ acc, mems }) => {
        mems.forEach((m: any) => {
          ;(map[m.id as string] ??= []).push({ account: acc, papel: m.papel as 'member' | 'account_admin' })
        })
      })
      setUserAccountsMap(map)
    })
  }, [accounts])

  // Create sheets
  const [sheetAccount, setSheetAccount] = useState(false)
  const [sheetSolution, setSheetSolution] = useState(false)
  const [sheetContract, setSheetContract] = useState(false)
  const [sheetEditOrg, setSheetEditOrg] = useState(false)
  const [showCriarOrgAdmin, setShowCriarOrgAdmin] = useState(false)

  // Delete / inativar org modals
  const [orgDeleteModal, setOrgDeleteModal] = useState<'inativar' | null>(null)
  const [orgExcluirModal, setOrgExcluirModal] = useState(false)
  const [orgInativarBlocked, setOrgInativarBlocked] = useState(false)
  const [orgExcluirBlocked, setOrgExcluirBlocked] = useState(false)

  // Inativar / excluir account modal
  const [accountInativarTarget, setAccountInativarTarget] = useState<Account | null>(null)
  const [accountInativarModal, setAccountInativarModal] = useState(false)
  const [accountInativarBlockedTarget, setAccountInativarBlockedTarget] = useState<Account | null>(null)
  const [accountExcluirTarget, setAccountExcluirTarget] = useState<Account | null>(null)
  const [accountExcluirModal, setAccountExcluirModal] = useState(false)
  const [accountExcluirBlockedTarget, setAccountExcluirBlockedTarget] = useState<Account | null>(null)
  const [showInativosAccount, setShowInativosAccount] = useState(false)
  const [showExcluidasAccount, setShowExcluidasAccount] = useState(false)

  // Inativar contract modal
  const [contractInativarTarget, setContractInativarTarget] = useState<Contract | null>(null)
  const [contractInativarModal, setContractInativarModal] = useState(false)

  // Delete solution modal
  const [solutionDeleteTarget, setSolutionDeleteTarget] = useState<Solution | null>(null)
  const [solutionDeleteBlockedTarget, setSolutionDeleteBlockedTarget] = useState<Solution | null>(null)

  // Inativar solution modal
  const [solutionInativarTarget, setSolutionInativarTarget] = useState<Solution | null>(null)
  const [solutionInativarModal, setSolutionInativarModal] = useState(false)
  const [solutionInativarBlockedTarget, setSolutionInativarBlockedTarget] = useState<Solution | null>(null)

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

  // ── Acompanhamento da Fase 2 dos contratos ───────────────────
  // Enquanto houver contrato provisionando, consulta o status das soluções a
  // cada 5s e promove o contrato quando o provisionamento termina. Para
  // sozinho ao não sobrar nenhum contrato em execução.
  const provisionando = contracts.filter(c => c.status === 'Provisionando')

  useProvisioningPolling({
    enabled: provisionando.length > 0,
    onPoll: async () => {
      const novos = await Promise.all(
        provisionando.map(async c => ({
          id: c.id,
          statusAnterior: c.status,
          status: deriveContractStatus(await getContractProvisioning(c.id), c.status),
        })),
      )
      const mudaram = novos.filter(n => n.status !== n.statusAnterior)
      if (mudaram.length === 0) return

      const porId = new Map(mudaram.map(m => [m.id, m.status]))
      const aplica = (c: Contract): Contract => {
        const novo = porId.get(c.id)
        return novo ? { ...c, status: novo } : c
      }
      setContracts(prev => prev.map(aplica))
      setSelectedContract(prev => (prev ? aplica(prev) : prev))

      // Persiste o estado terminal — sem isso o contrato voltaria a
      // "Provisionando" no próximo carregamento vindo da API.
      //
      // Só o campo `status`. Mandar o contrato inteiro colocaria `objetos` e
      // `contratante` no corpo, e é exatamente isso que faz o backend rodar a
      // validação de exclusividade de componentes — que reprova o contrato
      // contra as próprias soluções dele e devolve 422. Além disso o objeto
      // vem do estado carregado no mount e sobrescreveria qualquer edição
      // feita nesse meio-tempo.
      for (const m of mudaram) {
        api.updateContract(m.id, { status: m.status }).catch(() => {
          // Desfaz o otimismo: a tela não pode afirmar um status que o banco
          // não tem. O ciclo seguinte do polling tenta de novo.
          const desfaz = (c: Contract): Contract =>
            c.id === m.id ? { ...c, status: m.statusAnterior } : c
          setContracts(prev => prev.map(desfaz))
          setSelectedContract(prev => (prev ? desfaz(prev) : prev))
        })
      }
    },
  })

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Carregando organização…</p>
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

  // Métricas derivadas
  const orgAdminCount    = relations.orgAdmins.filter(a => a.orgId === id).length
  const activeAccountCount = accounts.filter(a => a.status !== 'Inativo').length

  // Tenta a API; se falhar (sem backend/sem .env), cai no fallback local
  async function handleAddAccount(account: Omit<Account, 'id'>) {
    const local: Account = { ...account, id: crypto.randomUUID() }
    try {
      const saved = await api.createAccount(local)
      setAccounts(prev => [...prev, saved])
      toast('Conta criada com sucesso.', 'success')
    } catch {
      setAccounts(prev => [...prev, local])
      toast('Não foi possível criar a conta. Revise os dados e tente novamente.', 'error')
    }
  }
  async function handleAddSolution(solution: Omit<Solution, 'id'>) {
    const local: Solution = { ...solution, id: crypto.randomUUID() }
    try {
      const saved = await api.createSolution(local)
      setSolutions(prev => [...prev, saved])
      toast('Solução criada com sucesso.', 'success')
    } catch (err) {
      // Não aplica fallback otimista: se o backend rejeitou (ex.: componente já
      // em uso por outra solução da mesma conta), a UI não deve fingir que salvou.
      toast(err instanceof Error ? err.message : 'Não foi possível criar a solução. Revise os dados e tente novamente.', 'error')
    }
  }
  async function handleAddContract(contract: Omit<Contract, 'id'>) {
    const local: Contract = { ...contract, id: crypto.randomUUID() }
    let criado = local
    try {
      criado = await api.createContract(local)
      setContracts(prev => [...prev, criado])
      toast('Contrato criado com sucesso.\nAs soluções estão sendo provisionadas.', 'success')
    } catch {
      setContracts(prev => [...prev, local])
      toast('Não foi possível criar o contrato.\nRevise os dados e tente novamente.', 'error')
      return
    }
    // Dispara a Fase 2 para as soluções deste contrato. O estado de cada uma
    // passa a ser observável na tela de provisionamento do tenant.
    const conta = accounts.find(a => a.name === criado.contratante)
    if (conta) {
      startContractProvisioning(criado.id, conta.id, criado.objetos.map(o => o.solucao))
    }
  }
  async function handleEditOrg(data: Omit<Organization, 'id' | 'qtdContas' | 'qtdSolucoes' | 'qtdContratos' | 'contacts'>) {
    try {
      const saved = await api.updateOrganization(id!, { ...org, ...data })
      setOrg(saved)
      toast('Organização atualizada com sucesso.', 'success')
    } catch {
      setOrg(prev => prev ? { ...prev, ...data } : prev)
      toast('Não foi possível salvar as alterações. Tente novamente.', 'error')
    }
  }
  async function handleSaveAccount(updated: Account) {
    try {
      const saved = await api.updateAccount(updated.id, updated)
      setAccounts(prev => prev.map(a => a.id === saved.id ? saved : a))
      setSelectedAccount(saved)
      toast('Conta atualizada com sucesso.', 'success')
    } catch {
      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))
      setSelectedAccount(updated)
      toast('Não foi possível salvar as alterações. Tente novamente.', 'error')
    }
    setEditingAccount(null)
  }
  async function handleUpdateContacts(contacts: Contact[]) {
    const previousContacts = org?.contacts ?? []
    const isRemoval = contacts.length < previousContacts.length
    try {
      const saved = await api.updateOrganization(id!, { ...org, contacts })
      setOrg(saved)
    } catch {
      setOrg(prev => prev ? { ...prev, contacts } : prev)
    }
    if (isRemoval) {
      toast('Contato removido.', 'success', {
        label: 'Desfazer',
        onClick: () => handleUpdateContacts(previousContacts),
      })
    }
  }
  async function handleSaveSolution(updated: Solution) {
    try {
      const saved = await api.updateSolution(updated.id, updated)
      setSolutions(prev => prev.map(s => s.id === saved.id ? saved : s))
      setSelectedSolution(saved)
      toast('Solução atualizada com sucesso.', 'success')
      // Recarrega contratos pois o backend sincronizou os objetos
      api.getContracts(id).then(fresh => {
        setContracts(fresh)
        // Atualiza selectedContract se estiver aberto (para refletir novos dados no detalhe)
        setSelectedContract(prev => prev ? (fresh.find(c => c.id === prev.id) ?? prev) : null)
      }).catch(() => {})
      setEditingSolution(null)
    } catch (err) {
      // Não aplica fallback otimista nem fecha o sheet: se o backend rejeitou
      // (ex.: componente já em uso por outra solução da mesma conta), o
      // usuário precisa ver o erro real e poder corrigir sem perder a edição.
      toast(err instanceof Error ? err.message : 'Não foi possível salvar as alterações. Tente novamente.', 'error')
    }
  }
  async function handleSaveContract(updated: Contract) {
    try {
      const saved = await api.updateContract(updated.id, updated)
      setContracts(prev => prev.map(c => c.id === saved.id ? saved : c))
      setSelectedContract(saved)
      toast('Contrato atualizado com sucesso.', 'success')
    } catch {
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
      setSelectedContract(updated)
      toast('Não foi possível salvar as alterações.\nTente novamente.', 'error')
    }
    setEditingContract(null)
  }

  // Inativa org (reversível)
  async function handleDeleteOrg() {
    try {
      await api.updateOrganization(org!.id, { ...org, status: 'Inativo' })
      toast('Organização inativada com sucesso.', 'success')
    } catch {
      toast('Não foi possível inativar a organização. Tente novamente.', 'error')
    }
    setOrgDeleteModal(null)
    navigate('/organizacoes')
  }

  // Exclui org permanentemente (só quando sem soluções e sem contratos)
  async function handleExcluirOrg() {
    if (!org) return
    try {
      await api.deleteOrganization(org.id)
      toast('Organização excluída com sucesso.', 'success')
      setOrgExcluirModal(false)
      navigate('/organizacoes')
    } catch {
      toast('Não foi possível excluir a organização. Verifique se existem contas, soluções ou contratos vinculados.', 'error')
      setOrgExcluirModal(false)
    }
  }

  // ── Regras de ciclo de vida (PAS-2507) ───────────────────────
  // A lógica de vínculo mora em src/lib/regrasCicloVida.ts — aqui só ligamos
  // os vereditos aos modais. Pré-requisito de baixo para cima, nunca cascata.

  // Usuários vinculados a uma conta — reaproveita o userAccountsMap já carregado.
  function usuariosDaConta(acc: Account): User[] {
    return orgUsers.filter(u => (userAccountsMap[u.id] ?? []).some(cv => cv.account.id === acc.id))
  }

  // Decisão do produto: conta em quarentena ainda é registro vinculado e bloqueia
  // a exclusão da organização. Sem `accountsExcluidas` aqui a regra nunca disparava
  // no front — só o backend barrava, e a UI abria o modal de confirmação à toa.
  const vExcluirOrg   = org ? podeExcluirOrganizacao(org, [...accounts, ...accountsExcluidas]) : null
  const vInativarOrg  = org ? podeInativarOrganizacao(org, accounts) : null
  const vInativarConta = (a: Account) => podeInativarConta(a, contracts)
  const vExcluirConta  = (a: Account) => podeExcluirConta(a, solutions, contracts, usuariosDaConta(a))
  const vExcluirSolucao = (s: Solution) => podeExcluirSolucao(s, componentes, contracts)

  // Abre o registro impeditivo listado no modal bloqueado — troca de aba e
  // abre o sheet de detalhe correspondente (não há rotas próprias nesta tela).
  function navegarParaImpedimento(imp: Impedimento) {
    if (imp.tipo === 'conta') {
      const a = accounts.find(x => x.id === imp.id)
      if (a) { setTab('conta'); setSelectedAccount(a) }
    } else if (imp.tipo === 'contrato') {
      const c = contracts.find(x => x.id === imp.id)
      if (c) { setTab('contrato'); setSelectedContract(c) }
    } else if (imp.tipo === 'solucao') {
      const s = solutions.find(x => x.id === imp.id)
      if (s) { setTab('solucoes'); setSelectedSolution(s) }
    } else if (imp.tipo === 'usuario') {
      const u = orgUsers.find(x => x.id === imp.id)
      if (u) { setTab('usuarios'); setSelectedOrgUser(u); setShowOrgUserDetail(true) }
    }
    // 'componente' não tem tela de detalhe nesta página — sem navegação.
  }

  async function handleActivateOrg() {
    if (!org) return
    try {
      const updated = await api.updateOrganization(org.id, { ...org, status: 'Ativo' })
      setOrg(updated)
    } catch {
      setOrg(prev => prev ? { ...prev, status: 'Ativo' } : prev)
    }
    setSheetEditOrg(false)
  }

  // Inativa a conta. Contratos vinculados NÃO são tocados aqui — a inativação só é
  // permitida quando todos os contratos ativos da conta já foram inativados
  // manualmente (checagem feita antes de abrir este fluxo, ver accountActiveContracts).
  async function handleInativarAccount(account: Account) {
    try {
      const updated = await api.updateAccount(account.id, { ...account, status: 'Inativo' })
      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))
      toast('Conta inativada com sucesso.', 'success')
    } catch {
      toast('Não foi possível inativar a conta. Tente novamente.', 'error')
    }
    setAccountInativarModal(false)
    setAccountInativarTarget(null)
    setEditingAccount(null)
  }

  async function handleActivateAccount(account: Account) {
    try {
      const updated = await api.updateAccount(account.id, { ...account, status: 'Ativo' })
      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a))
    } catch {
      setAccounts(prev => prev.map(a => a.id === account.id ? { ...account, status: 'Ativo' } : a))
    }
    setEditingAccount(null)
  }

  // `true` quando não houve resposta do backend — fetch rejeitado (offline) ou
  // 5xx do proxy do Vite quando `npm run dev:server` não está rodando. Só nesse
  // caso vale aplicar a mudança localmente, para o protótipo funcionar com o
  // mock. Se o servidor RESPONDEU recusando (422 com motivo), a tela não pode
  // fingir que a operação aconteceu — o erro real vai para o toast.
  const semBackend = (e: unknown) =>
    e instanceof TypeError || /^API error 5\d\d/.test(e instanceof Error ? e.message : '')

  // Exclusão de conta é soft delete: o registro entra em quarentena de 30 dias
  // (deletedAt) e continua restaurável por "Cancelar exclusão".
  async function handleDeleteAccount(account: Account) {
    const emQuarentena: Account = { ...account, deletedAt: new Date().toISOString() }
    const aplicar = () => {
      setAccounts(prev => prev.filter(a => a.id !== account.id))
      setAccountsExcluidas(prev => [...prev.filter(a => a.id !== account.id), emQuarentena])
    }
    try {
      await api.deleteAccount(account.id)
      aplicar()
      toast('Conta excluída com sucesso.', 'success')
    } catch (err) {
      if (semBackend(err)) {
        aplicar()
        toast('Conta excluída com sucesso.', 'success')
      } else {
        toast(err instanceof Error ? err.message : 'Não foi possível excluir a conta. Verifique se existem soluções ou contratos vinculados.', 'error')
      }
    }
    setAccountExcluirModal(false)
    setAccountExcluirTarget(null)
    setEditingAccount(null)
  }

  // Cancela a exclusão durante a quarentena — limpa deletedAt e devolve a conta
  // à listagem. A conta volta com o status que tinha (inativa, pela hipótese 4).
  async function handleRestoreAccount(account: Account) {
    const restaurada: Account = { ...account, deletedAt: undefined }
    const aplicar = () => {
      setAccountsExcluidas(prev => prev.filter(a => a.id !== account.id))
      setAccounts(prev => [...prev.filter(a => a.id !== account.id), restaurada])
    }
    try {
      const saved = await api.restoreAccount(account.id)
      setAccountsExcluidas(prev => prev.filter(a => a.id !== account.id))
      setAccounts(prev => [...prev.filter(a => a.id !== account.id), saved ?? restaurada])
      toast('Exclusão cancelada. A conta foi restaurada.', 'success')
    } catch (err) {
      if (semBackend(err)) {
        aplicar()
        toast('Exclusão cancelada. A conta foi restaurada.', 'success')
      } else {
        toast('Não foi possível cancelar a exclusão. Tente novamente.', 'error')
      }
    }
  }

  async function handleInativarContract(contract: Contract) {
    try {
      const updated = await api.updateContract(contract.id, { ...contract, status: 'Inativo' })
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast('Contrato inativado com sucesso.', 'success')
    } catch {
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...contract, status: 'Inativo' } : c))
      toast('Não foi possível inativar o contrato.\nTente novamente.', 'error')
    }
    setContractInativarModal(false)
    setContractInativarTarget(null)
    setEditingContract(null)
  }

  async function handleActivateContract(contract: Contract) {
    try {
      const updated = await api.updateContract(contract.id, { ...contract, status: 'Ativo' })
      setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
    } catch {
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...contract, status: 'Ativo' } : c))
    }
    setEditingContract(null)
  }

  async function handleDeleteSolution() {
    if (!solutionDeleteTarget) return
    try {
      await api.deleteSolution(solutionDeleteTarget.id)
      setSolutions(prev => prev.filter(s => s.id !== solutionDeleteTarget.id))
      toast('Solução excluída com sucesso.', 'success')
    } catch {
      toast('Não foi possível excluir a solução. Tente novamente.', 'error')
    }
    setSolutionDeleteTarget(null)
    setEditingSolution(null)
  }

  // Inativa a solução. Contratos vinculados NÃO são tocados aqui — a inativação só é
  // permitida quando eles já foram inativados manualmente (checagem feita antes de
  // abrir este fluxo, ver requestInactivateSolution/solutionActiveContracts).
  async function handleInactivateSolution(solution: Solution) {
    try {
      const updated = await api.updateSolution(solution.id, { ...solution, status: 'Inativo' })
      setSolutions(prev => prev.map(s => s.id === updated.id ? updated : s))
      toast('Solução inativada com sucesso.', 'success')
    } catch {
      toast('Não foi possível inativar a solução. Tente novamente.', 'error')
    }
    setSolutionInativarModal(false)
    setSolutionInativarTarget(null)
    setEditingSolution(null)
  }

  // Contratos ativos vinculados a esta solução — bloqueiam a inativação dela.
  // Regra pré-existente, não redefinida pela PAS-2507 (que trata de Contrato,
  // Conta e Organização); por isso continua como checagem local.
  function solutionActiveContracts(solution: Solution) {
    return contracts.filter(c => c.status !== 'Inativo' && c.objetos.some(o => o.solucao === solution.name))
  }

  function requestInactivateSolution(solution: Solution) {
    setEditingSolution(null)
    if (solutionActiveContracts(solution).length > 0) {
      setSolutionInativarBlockedTarget(solution)
    } else {
      setSolutionInativarTarget(solution)
      setSolutionInativarModal(true)
    }
  }

  async function handleActivateSolution(solution: Solution) {
    try {
      const updated = await api.updateSolution(solution.id, { ...solution, status: 'Ativo' })
      setSolutions(prev => prev.map(s => s.id === updated.id ? updated : s))
    } catch {
      setSolutions(prev => prev.map(s => s.id === solution.id ? { ...solution, status: 'Ativo' } : s))
    }
    setEditingSolution(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conta',     label: 'Conta' },
    { key: 'usuarios',  label: 'Usuários' },
    { key: 'solucoes',  label: 'Soluções e planos' },
    { key: 'contrato',  label: 'Contrato' },
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

          {/* Organizações vinculadas — oculto temporariamente (funcionalidade não pronta)
          <hr className="border-[#e5e7eb]" />
          <FieldGroup title="Organizações vinculadas">
            <p className="text-sm font-medium text-[#030712]">Não há organizações vinculadas</p>
          </FieldGroup>
          */}

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
                {tab === 'conta'     ? 'Conta'
                  : tab === 'usuarios'  ? 'Usuários'
                  : tab === 'solucoes'  ? 'Soluções e planos'
                  : tab === 'contrato'  ? 'Contrato'
                  : 'Marketplace'}
              </h2>
              <p className="text-base text-[#6b7280] leading-6">
                {tab === 'conta'     ? 'Gerencie as contas vinculadas a esta organização, incluindo usuários, acessos e configurações de cada conta.'
                  : tab === 'usuarios'  ? 'Todos os usuários da organização, independente da conta a que pertencem.'
                  : tab === 'solucoes'  ? 'Visualize e edite as soluções contratadas por esta organização, seus planos e os componentes que as compõem.'
                  : tab === 'contrato'  ? 'Acompanhe os contratos ativos e histórico de contratações desta organização, com detalhes de vigência e objetos contratados.'
                  : 'Esta funcionalidade estará disponível em breve.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {/* Criação de Org Admin (Platform Admin only) — só na aba Usuários, onde os usuários da org são listados */}
              {isPlatformAdmin && tab === 'usuarios' && (
                <Button variant="outline" onClick={() => setShowCriarOrgAdmin(true)}>
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Criar Org Admin
                </Button>
              )}

              <div className="flex items-center gap-8">
                {tab === 'conta' && (() => {
                  const hasInativas  = accounts.some(a => a.status === 'Inativo')
                  const hasExcluidas = accountsExcluidas.length > 0
                  return (
                    <div className="flex items-center gap-6">
                      <label className={`flex items-start gap-2 ${hasInativas ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                        <input
                          type="checkbox"
                          checked={showInativosAccount && hasInativas}
                          onChange={e => hasInativas && setShowInativosAccount(e.target.checked)}
                          disabled={!hasInativas}
                          className="w-4 h-4 mt-[1px] rounded border border-[#e5e7eb] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] shrink-0 accent-[#2563eb] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-[#030712] leading-none">Exibir contas inativadas</span>
                      </label>
                      <label className={`flex items-start gap-2 ${hasExcluidas ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                        <input
                          type="checkbox"
                          checked={showExcluidasAccount && hasExcluidas}
                          onChange={e => hasExcluidas && setShowExcluidasAccount(e.target.checked)}
                          disabled={!hasExcluidas}
                          className="w-4 h-4 mt-[1px] rounded border border-[#e5e7eb] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] shrink-0 accent-[#2563eb] cursor-pointer"
                        />
                        <span className="text-sm font-medium text-[#030712] leading-none">Exibir contas excluídas</span>
                      </label>
                    </div>
                  )
                })()}
                {tab === 'solucoes' && (() => {
                  const hasInativas = solutions.some(s => s.status === 'Inativo')
                  return (
                    <label className={`flex items-start gap-2 ${hasInativas ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                      <input
                        type="checkbox"
                        checked={showInativas && hasInativas}
                        onChange={e => hasInativas && setShowInativas(e.target.checked)}
                        disabled={!hasInativas}
                        className="w-4 h-4 mt-[1px] rounded border border-[#e5e7eb] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] shrink-0 accent-[#2563eb] cursor-pointer"
                      />
                      <span className="text-sm font-medium text-[#030712] leading-none">Exibir soluções inativadas</span>
                    </label>
                  )
                })()}
                {tab === 'contrato' && (() => {
                  const hasInativos = contracts.some(c => c.status === 'Inativo')
                  return (
                    <label className={`flex items-start gap-2 ${hasInativos ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                      <input
                        type="checkbox"
                        checked={showInativosContract && hasInativos}
                        onChange={e => hasInativos && setShowInativosContract(e.target.checked)}
                        disabled={!hasInativos}
                        className="w-4 h-4 mt-[1px] rounded border border-[#e5e7eb] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] shrink-0 accent-[#2563eb] cursor-pointer"
                      />
                      <span className="text-sm font-medium text-[#030712] leading-none">Exibir contratos inativados</span>
                    </label>
                  )
                })()}
                {tab !== 'marketplace' && (() => {
                  const canCreate =
                    tab === 'conta'     ? (isPlatformAdmin || isOrgAdmin) :
                    tab === 'usuarios'  ? (isPlatformAdmin || isOrgAdmin) :
                    tab === 'solucoes'  ? (isPlatformAdmin || isPasArchitect) :
                    tab === 'contrato'  ? isPlatformAdmin :
                    false
                  if (!canCreate) return null
                  return (
                    <Button onClick={() => {
                      if (tab === 'conta')    setSheetAccount(true)
                      else if (tab === 'usuarios')  setShowCriarUsuario(true)
                      else if (tab === 'solucoes')  setSheetSolution(true)
                      else if (tab === 'contrato')  setSheetContract(true)
                    }}>
                      {tab === 'conta'     ? 'Criar Conta'
                        : tab === 'usuarios'  ? 'Criar usuário'
                        : tab === 'solucoes'  ? 'Criar Solução'
                        : 'Criar Contrato'}
                    </Button>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-8">

          {/* CONTA TAB */}
          {tab === 'conta' && (
            <>
              {/* Cards de métricas */}
              <div className="flex divide-x divide-gray-200 bg-white border border-gray-200 rounded-2xl overflow-hidden mb-6">
                {[
                  { label: 'Total de usuários',        value: userCount,         loading: loadingMetrics },
                  { label: 'Contas ativas',             value: activeAccountCount, loading: false         },
                  { label: 'Administradores da org',   value: orgAdminCount,     loading: false         },
                ].map(m => (
                  <div key={m.label} className="flex-1 px-6 py-4 min-w-0">
                    <p className="text-2xl font-bold text-[#030712] leading-8">
                      {m.loading
                        ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" />
                        : m.value}
                    </p>
                    <p className="text-xs text-[#6b7280] mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {(() => {
                // Contas em quarentena vão para o fim da lista e só aparecem sob demanda.
                const visibleAccounts = [
                  ...accounts.filter(a => showInativosAccount || a.status !== 'Inativo'),
                  ...(showExcluidasAccount ? accountsExcluidas : []),
                ]
                return visibleAccounts.length === 0 ? (
                  <EmptyState message="Nenhuma conta criada" description="Crie uma conta para provisionar o sistema." />
                ) : (
                  <div className="border border-[#e5e7eb] rounded-2xl p-4 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e5e7eb]">
                          <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[184px]">Nome</th>
                          <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[169px] leading-snug">Provisionamento</th>
                          <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10">Subdomínio</th>
                          <th className="text-center px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[120px]">Arquiteto PAS</th>
                          <th className="text-center px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[131px]">Status</th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {visibleAccounts.map(a => {
                          const isExcluida = !!a.deletedAt
                          const isInativo = a.status === 'Inativo' || isExcluida
                          const expurgo = isExcluida ? previsaoExclusaoPermanente(a.deletedAt) : null
                          return (
                            <tr
                              key={a.id}
                              className="group/row border-b border-[#e5e7eb] last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedAccount(a)}
                            >
                              <td className="px-2 py-2 h-[52px]">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-sm font-medium text-[#6b7280] shrink-0 ${isInativo ? 'opacity-40' : ''}`}>{a.name.charAt(0)}</div>
                                  <div className="min-w-0">
                                    <span className={`text-sm font-medium block ${isInativo ? 'text-[#9ca3af]' : 'text-[#030712]'}`}>{a.name}</span>
                                    {expurgo && (
                                      <span className="text-xs text-red-600 block leading-4">
                                        {expurgo.diasRestantes === 0
                                          ? 'Exclusão permanente pendente'
                                          : expurgo.diasRestantes === 1
                                            ? 'Exclusão permanente em 1 dia'
                                            : `Exclusão permanente em ${expurgo.diasRestantes} dias`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-2 h-[52px]">
                                {isInativo ? (
                                  <span className="text-xs text-[#9ca3af]">—</span>
                                ) : (
                                  <ProvisioningDotsButton
                                    status={a.provisioningStatus}
                                    onClick={e => { e.stopPropagation(); navigate(`/contas/${a.id}/provisionamento`) }}
                                  />
                                )}
                              </td>
                              <td className={`px-2 py-2 h-[52px] text-sm ${isInativo ? 'text-[#9ca3af]' : 'text-[#030712]'}`}>{a.subdomain}</td>
                              <td className={`px-2 py-2 h-[52px] text-sm text-center ${isInativo ? 'text-[#9ca3af]' : 'text-[#030712]'}`}>{a.arquitetoPAS}</td>
                              <td className="px-2 py-2 h-[52px] text-center">
                                <Badge
                                  variant={isExcluida ? 'error' : a.status === 'Inativo' ? 'secondary' : 'success'}
                                  showIcon
                                >
                                  {isExcluida ? 'Em quarentena' : a.status === 'Inativo' ? 'Inativo' : 'Ativo'}
                                </Badge>
                              </td>
                              <td className="px-2 py-2 h-[52px] text-center" onClick={e => e.stopPropagation()}>
                                {isExcluida ? (
                                  <button
                                    type="button"
                                    title="Cancelar exclusão"
                                    onClick={() => handleRestoreAccount(a)}
                                    className="w-8 h-8 flex items-center justify-center mx-auto rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors opacity-0 group-hover/row:opacity-100"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                ) : isInativo ? (
                                  <button
                                    type="button"
                                    title="Ativar conta"
                                    onClick={() => handleActivateAccount(a)}
                                    className="w-8 h-8 flex items-center justify-center mx-auto rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors opacity-0 group-hover/row:opacity-100"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </>
          )}

          {/* USUÁRIOS TAB */}
          {tab === 'usuarios' && (
            <>
              {loadingMetrics ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : orgUsers.length === 0 ? (
                <EmptyState message="Nenhum usuário encontrado" description="Convide usuários para que apareçam aqui." />
              ) : (
                <div className="border border-[#e5e7eb] rounded-2xl p-4 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10">Nome</th>
                        <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10">E-mail</th>
                        <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[180px]">Cargo</th>
                        <th className="text-left px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[140px]">Área</th>
                        <th className="text-center px-2 pb-2.5 align-bottom text-sm font-medium text-[#030712] opacity-40 h-10 w-[120px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgUsers.map(u => (
                        <tr
                          key={u.id}
                          className="border-b border-[#e5e7eb] last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => { setSelectedOrgUser(u); setShowOrgUserDetail(true) }}
                        >
                          <td className="px-2 py-2 h-[52px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <OrgUserAvatar nome={u.nomeCompleto} />
                              <span className="text-sm font-medium text-[#030712] truncate">{u.nomeCompleto}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#6b7280] truncate max-w-0">
                            <span className="block truncate">{u.email}</span>
                          </td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712] w-[180px]">{u.cargo || '—'}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712] w-[140px]">{u.area || '—'}</td>
                          <td className="px-2 py-2 h-[52px] text-center w-[120px]">
                            <Badge
                              variant={u.status === 'Ativo' ? 'success' : 'secondary'}
                              showIcon
                            >
                              {u.status}
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

          {/* SOLUÇÕES TAB */}
          {tab === 'solucoes' && (
            <>
              {(() => {
                const visibleSolutions = solutions.filter(s => showInativas || s.status !== 'Inativo')
                return visibleSolutions.length === 0 ? (
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
                      {visibleSolutions.map(s => (
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
                          {/* Componentes — nomes separados por " / " */}
                          <td className="px-2 py-2 h-[52px] w-[133px] max-w-[133px]">
                            {(s.componenteIds ?? []).length > 0
                              ? <span className="text-sm text-[#030712] block truncate">
                                  {componentes
                                    .filter(c => (s.componenteIds ?? []).includes(c.id))
                                    .map(c => c.nome)
                                    .join(' / ') || '—'}
                                </span>
                              : <span className="text-sm text-[#9ca3af]">—</span>
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
                              variant={s.status === 'Ativo' ? 'success' : 'secondary'}
                              showIcon
                            >
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              })()}
            </>
          )}

          {/* CONTRATO TAB */}
          {tab === 'contrato' && (
            <>
              {(() => {
                const visibleContracts = contracts.filter(c => showInativosContract || c.status !== 'Inativo')
                return visibleContracts.length === 0 ? (
                <EmptyState message="Nenhum contrato criado" description="Crie um contrato para esta organização." />
              ) : (
                <div className="border border-[#e5e7eb] rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="text-left px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[184px]">Conta contratante</th>
                        <th className="text-left px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[169px]">Soluções</th>
                        <th className="text-left px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[85px]">Plano</th>
                        <th className="text-right px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[109px]">Data início</th>
                        <th className="text-right px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[109px]">Data término</th>
                        <th className="text-center px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[120px]">Renovação</th>
                        <th className="text-center px-2 pb-2.5 align-bottom font-medium text-[#030712] opacity-40 h-10 w-[131px]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleContracts.map(c => (
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
                          {/* Datas — sempre por formatarData: o banco guarda os dois
                              formatos (ISO em contrato criado pela tela, dd/mm/aaaa
                              nos fixtures), e imprimir cru fazia a mesma coluna
                              mostrar "2026-08-14" e "24/03/2026" lado a lado. */}
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{formatarData(c.dataInicio)}</td>
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712]">{formatarData(c.dataTermino)}</td>
                          {/* Renovação */}
                          <td className="px-2 py-2 h-[52px] text-sm text-[#030712] text-center">{c.renovacao}</td>
                          {/* Status */}
                          <td className="px-2 py-2 h-[52px] text-center">
                            <ContractStatusBadge status={c.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              })()}
            </>
          )}

          {/* MARKETPLACE TAB */}
          {tab === 'marketplace' && (() => {
            const mktSolutions = solutions.filter(s => s.marketplace === 'Ativo')
            if (mktSolutions.length === 0) {
              return <EmptyState message="Nenhuma solução no marketplace" description="Ative o marketplace em uma solução para que ela apareça aqui." />
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {mktSolutions.map(s => {
                  const links = [
                    s.link01 && s.titleLink01 ? { href: s.link01, label: s.titleLink01 } : null,
                    s.link02 && s.titleLink02 ? { href: s.link02, label: s.titleLink02 } : null,
                  ].filter(Boolean) as { href: string; label: string }[]

                  const statusColor =
                    s.marketplaceStatus === 'Disponível' ? 'bg-green-50 text-green-700 border border-green-200' :
                    s.marketplaceStatus === 'Em breve'   ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                           'bg-gray-100 text-gray-600 border border-gray-200'

                  return (
                    <div key={s.id} className="flex flex-col gap-4 border border-[#e5e7eb] rounded-2xl p-5 bg-white">
                      {/* header */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <span className="text-gray-400 text-base font-bold">{s.name.charAt(0)}</span>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <p className="text-sm font-semibold text-[#030712] leading-5 truncate">{s.name}</p>
                          {s.marketplaceStatus && (
                            <span className={`inline-flex w-fit text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                              {s.marketplaceStatus}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* description */}
                      {s.description && (
                        <p className="text-sm text-[#6b7280] leading-5 line-clamp-2">{s.description}</p>
                      )}

                      {/* links */}
                      {links.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-auto pt-1">
                          {links.map((lk, i) => (
                            <a
                              key={i}
                              href={lk.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center h-8 px-3 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 transition-colors shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
                            >
                              {lk.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

        </div>
      </div>

      {/* Delete modals */}
      <ConfirmDeleteModal
        open={orgDeleteModal === 'inativar'}
        onClose={() => setOrgDeleteModal(null)}
        variant="inativar-org"
        name={org?.name ?? ''}
        onConfirm={handleDeleteOrg}
      />
      <ConfirmDeleteModal
        open={orgExcluirModal}
        onClose={() => setOrgExcluirModal(false)}
        variant="excluir-org"
        name={org?.name ?? ''}
        onConfirm={handleExcluirOrg}
      />
      <ConfirmDeleteModal
        open={orgExcluirBlocked}
        onClose={() => setOrgExcluirBlocked(false)}
        variant="blocked"
        name={org?.name ?? ''}
        blockedTitle="Não é possível excluir esta organização"
        blockedDescription={
          vExcluirOrg?.motivo === 'registro-ativo'
            ? 'Não é possível excluir esta organização. Ela precisa estar inativa antes de ser excluída.'
            : 'Não é possível excluir esta organização. Existem contas vinculadas:'
        }
        actionLabel="excluir"
        blocked={vExcluirOrg?.impedimentos ?? []}
        onNavegar={navegarParaImpedimento}
      />
      <ConfirmDeleteModal
        open={orgInativarBlocked}
        onClose={() => setOrgInativarBlocked(false)}
        variant="blocked"
        name={org?.name ?? ''}
        blockedTitle="Não é possível inativar esta organização"
        blockedDescription="Não é possível inativar esta organização. Existem contas ativas vinculadas. Inative primeiro as contas:"
        actionLabel="inativar"
        blocked={vInativarOrg?.impedimentos ?? []}
        onNavegar={navegarParaImpedimento}
      />
      <ConfirmDeleteModal
        open={accountInativarModal}
        onClose={() => { setAccountInativarModal(false); setAccountInativarTarget(null) }}
        variant="inativar-conta"
        name={accountInativarTarget?.name ?? ''}
        onConfirm={() => accountInativarTarget && handleInativarAccount(accountInativarTarget)}
      />
      <ConfirmDeleteModal
        open={!!accountInativarBlockedTarget}
        onClose={() => setAccountInativarBlockedTarget(null)}
        variant="blocked"
        name={accountInativarBlockedTarget?.name ?? ''}
        blockedTitle="Não é possível inativar esta conta"
        blockedDescription="Não é possível inativar esta conta. Existem contratos vigentes vinculados. Inative primeiro os contratos:"
        actionLabel="inativar"
        blocked={accountInativarBlockedTarget ? vInativarConta(accountInativarBlockedTarget).impedimentos : []}
        onNavegar={navegarParaImpedimento}
      />
      <ConfirmDeleteModal
        open={accountExcluirModal}
        onClose={() => { setAccountExcluirModal(false); setAccountExcluirTarget(null) }}
        variant="account"
        name={accountExcluirTarget?.name ?? ''}
        onConfirm={() => accountExcluirTarget && handleDeleteAccount(accountExcluirTarget)}
      />
      <ConfirmDeleteModal
        open={!!accountExcluirBlockedTarget}
        onClose={() => setAccountExcluirBlockedTarget(null)}
        variant="blocked"
        name={accountExcluirBlockedTarget?.name ?? ''}
        blockedTitle="Não é possível excluir esta conta"
        blockedDescription={
          accountExcluirBlockedTarget && vExcluirConta(accountExcluirBlockedTarget).motivo === 'registro-ativo'
            ? 'Não é possível excluir esta conta. Ela precisa estar inativa antes de ser excluída.'
            : 'Não é possível excluir esta conta. Existem soluções ou contratos vinculados:'
        }
        actionLabel="excluir"
        blocked={accountExcluirBlockedTarget ? vExcluirConta(accountExcluirBlockedTarget).impedimentos : []}
        onNavegar={navegarParaImpedimento}
      />

      <ConfirmDeleteModal
        open={contractInativarModal}
        onClose={() => { setContractInativarModal(false); setContractInativarTarget(null) }}
        variant="inativar-contrato"
        name={contractInativarTarget?.contratante ?? ''}
        onConfirm={() => contractInativarTarget && handleInativarContract(contractInativarTarget)}
      />

      <ConfirmDeleteModal
        open={!!solutionDeleteTarget}
        onClose={() => setSolutionDeleteTarget(null)}
        variant="solution"
        name={solutionDeleteTarget?.name ?? ''}
        onConfirm={handleDeleteSolution}
      />
      <ConfirmDeleteModal
        open={!!solutionDeleteBlockedTarget}
        onClose={() => setSolutionDeleteBlockedTarget(null)}
        variant="blocked"
        name={solutionDeleteBlockedTarget?.name ?? ''}
        blockedTitle="Não é possível excluir esta solução"
        blockedDescription={
          solutionDeleteBlockedTarget && vExcluirSolucao(solutionDeleteBlockedTarget).motivo === 'registro-ativo'
            ? 'Não é possível excluir esta solução. Ela precisa estar inativa antes de ser excluída.'
            : 'Não é possível excluir esta solução. Existem componentes ou contratos vinculados:'
        }
        actionLabel="excluir"
        blocked={solutionDeleteBlockedTarget ? vExcluirSolucao(solutionDeleteBlockedTarget).impedimentos : []}
        onNavegar={navegarParaImpedimento}
      />

      <ConfirmDeleteModal
        open={solutionInativarModal}
        onClose={() => { setSolutionInativarModal(false); setSolutionInativarTarget(null) }}
        variant="inativar-solucao"
        name={solutionInativarTarget?.name ?? ''}
        onConfirm={() => solutionInativarTarget && handleInactivateSolution(solutionInativarTarget)}
      />
      <ConfirmDeleteModal
        open={!!solutionInativarBlockedTarget}
        onClose={() => setSolutionInativarBlockedTarget(null)}
        variant="blocked"
        name={solutionInativarBlockedTarget?.name ?? ''}
        blockedTitle="Não é possível inativar esta solução"
        blockedDescription="Não é possível inativar esta solução. Existem contratos vigentes vinculados. Inative primeiro os contratos:"
        actionLabel="inativar"
        blocked={
          solutionInativarBlockedTarget
            ? solutionActiveContracts(solutionInativarBlockedTarget).map(c => ({
                tipo: 'contrato' as const, id: c.id, nome: `Contrato · ${c.contratante}`,
              }))
            : []
        }
        onNavegar={navegarParaImpedimento}
      />

      {/* Create sheets */}
      <NewAccountSheet open={sheetAccount} onClose={() => setSheetAccount(false)} orgId={org.id} onSave={handleAddAccount} />
      <NewSolutionSheet
        open={sheetSolution}
        onClose={() => setSheetSolution(false)}
        orgId={org.id}
        onSave={handleAddSolution}
        tiposLicenca={tiposLicenca}
      />
      <NewContractSheet open={sheetContract} onClose={() => setSheetContract(false)} orgId={org.id} orgName={org.name} accounts={accounts} solutions={solutions} contracts={contracts} onSave={handleAddContract} />
      <EditOrganizationSheet
        open={sheetEditOrg}
        onClose={() => setSheetEditOrg(false)}
        org={org}
        onSave={updated => handleEditOrg(updated)}
        onDelete={() => {
          setSheetEditOrg(false)
          if (vExcluirOrg?.permitido) setOrgExcluirModal(true)
          else setOrgExcluirBlocked(true)
        }}
        onInativar={() => {
          setSheetEditOrg(false)
          if (vInativarOrg?.permitido) setOrgDeleteModal('inativar')
          else setOrgInativarBlocked(true)
        }}
        onActivate={handleActivateOrg}
      />

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
          onDelete={() => {
            setEditingAccount(null)
            if (vExcluirConta(editingAccount).permitido) {
              setAccountExcluirTarget(editingAccount)
              setAccountExcluirModal(true)
            } else {
              setAccountExcluirBlockedTarget(editingAccount)
            }
          }}
          onInativar={() => {
            setEditingAccount(null)
            if (vInativarConta(editingAccount).permitido) {
              setAccountInativarTarget(editingAccount)
              setAccountInativarModal(true)
            } else {
              setAccountInativarBlockedTarget(editingAccount)
            }
          }}
          onActivate={() => handleActivateAccount(editingAccount)}
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
          onDelete={() => {
            setEditingSolution(null)
            if (vExcluirSolucao(editingSolution).permitido) {
              setSolutionDeleteTarget(editingSolution)
            } else {
              setSolutionDeleteBlockedTarget(editingSolution)
            }
          }}
          onInactivate={() => requestInactivateSolution(editingSolution)}
          onActivate={() => handleActivateSolution(editingSolution)}
          tiposLicenca={tiposLicenca}
          componentes={componentes}
        />
      )}
      <ContractDetailSheet
        open={!!selectedContract}
        onClose={() => setSelectedContract(null)}
        contract={selectedContract}
        onEdit={() => selectedContract && handleEditContractFromDetail(selectedContract)}
        provisionamentoHref={(() => {
          // Vínculo conta↔contrato por nome — mesmo join usado no resto do app.
          const conta = accounts.find(a => a.name === selectedContract?.contratante)
          return conta ? `/contas/${conta.id}/provisionamento` : undefined
        })()}
      />
      {editingContract && (
        <EditContractSheet
          key={editingContract.id}
          open={!!editingContract}
          onClose={() => setEditingContract(null)}
          contract={editingContract}
          solutions={solutions}
          accounts={accounts}
          contracts={contracts}
          onSave={handleSaveContract}
          onInativar={() => {
            setContractInativarTarget(editingContract)
            setContractInativarModal(true)
            setEditingContract(null)
          }}
          onActivate={() => handleActivateContract(editingContract)}
        />
      )}
      <CriarUsuarioSheet
        open={showCriarOrgAdmin}
        onClose={() => setShowCriarOrgAdmin(false)}
        variant="org-admin"
      />
      <CriarUsuarioSheet
        open={showCriarUsuario}
        onClose={() => setShowCriarUsuario(false)}
      />
      <UsuarioDetailOrgSheet
        open={showOrgUserDetail}
        onClose={() => setShowOrgUserDetail(false)}
        user={selectedOrgUser}
        contasVinculadas={selectedOrgUser ? (userAccountsMap[selectedOrgUser.id] ?? []) : []}
        todasContas={accounts}
        onVincularSuccess={(userId, conta) => {
          setUserAccountsMap(prev => ({
            ...prev,
            [userId]: [...(prev[userId] ?? []), conta],
          }))
        }}
        onPapelChange={(userId, accountId, novoPapel) => {
          setUserAccountsMap(prev => ({
            ...prev,
            [userId]: (prev[userId] ?? []).map(cv =>
              cv.account.id === accountId ? { ...cv, papel: novoPapel } : cv
            ),
          }))
        }}
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

/* ── helpers ───────────────────────────────────────────── */

/**
 * Botão que abre o detalhe de provisionamento, com as bolinhas dentro.
 *
 * Extraído para poder ter seu próprio `useState` do foco — sem isso, o
 * `<button>` teria um `<div tabIndex="0">` (o wrapper do Tooltip de
 * `ProvisioningDots`) dentro dele: elemento focável dentro de elemento
 * focável, virando uma segunda parada de Tab para uma única ação, achado
 * na revisão externa. `tabIndexed={false}` tira o foco próprio das bolinhas;
 * quem passa a controlar a exibição do balão é o foco real do botão.
 */
function ProvisioningDotsButton({
  status,
  onClick,
}: {
  status: ProvisioningOverallStatus
  onClick: (e: React.MouseEvent) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <button
      type="button"
      title="Ver detalhes do provisionamento"
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="inline-flex items-center rounded p-1 -m-1 hover:bg-gray-100 transition-colors"
    >
      <ProvisioningDots status={status} tabIndexed={false} focused={focused} />
    </button>
  )
}

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

const AVATAR_COLORS = [
  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  { bg: 'bg-green-100',  text: 'text-green-700'  },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  { bg: 'bg-teal-100',   text: 'text-teal-700'   },
]
function OrgUserAvatar({ nome }: { nome: string }) {
  const hash = nome.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const { bg, text } = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold select-none ${bg} ${text}`}>
      {ini}
    </div>
  )
}
