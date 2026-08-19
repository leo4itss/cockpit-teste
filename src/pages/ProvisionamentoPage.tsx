/**
 * ProvisionamentoPage — Tela de Detalhes de Provisionamento de um tenant.
 *
 * Rota: /contas/:id/provisionamento
 *
 * Consome o contrato mockado em `src/services/provisioning.ts` (swap point
 * único para o pas-cockpit-worker real). Ver plano PAS-2409.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, ShieldOff, AlertTriangle, RefreshCw, Building2, RotateCcw, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/provisionamento/ProvisioningCard'
import { TenantInfoCard } from '@/components/provisionamento/TenantInfoCard'
import { ProvisioningSummaryBar } from '@/components/provisionamento/ProvisioningSummaryBar'
import { ProvisioningStepsTimeline } from '@/components/provisionamento/ProvisioningStepsTimeline'
import { Fase2ProvisioningCard } from '@/components/provisionamento/Fase2ProvisioningCard'
import { LinkedSolutionsCard } from '@/components/provisionamento/LinkedSolutionsCard'
import { ActiveContractsCard } from '@/components/provisionamento/ActiveContractsCard'
import { HealthCheckPanel } from '@/components/provisionamento/HealthCheckPanel'
import { LogsSheet } from '@/components/provisionamento/LogsSheet'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { useCanViewProvisioning, useCanReprovisionTenant, useCanViewTenantLogs, useCanRunTenantHealthCheck } from '@/authz/hooks'
import { useProvisioningPolling } from '@/hooks/useProvisioningPolling'
import {
  getProvisioning,
  reprovisionTenant,
  ProvisioningNotFoundError,
  deriveSummary,
  resolveAccountContracts,
  resolveAccountSolutionNames,
} from '@/services/provisioning'
import { api } from '@/api/client'
import { accounts as mockAccounts, contracts as mockContracts, solutions as mockSolutions } from '@/data/mock'
import type { Account, Contract, Solution, ProvisioningFetchState, ProvisioningOverallStatus, ProvisioningSnapshot } from '@/types'

const STATUS_BADGE: Record<ProvisioningOverallStatus, { variant: 'success' | 'info' | 'default' | 'error'; label: string }> = {
  COMPLETED: { variant: 'success', label: 'Concluído' },
  IN_PROGRESS: { variant: 'info', label: 'Em andamento' },
  PENDING: { variant: 'default', label: 'Pendente' },
  FAILED: { variant: 'error', label: 'Falhou' },
}

export function ProvisionamentoPage() {
  const { id } = useParams<{ id: string }>()
  const { toasts, toast, dismiss } = useToast()

  // undefined = ainda resolvendo; null = conta não encontrada
  const [account, setAccount] = useState<Account | null | undefined>(undefined)
  const [fetchState, setFetchState] = useState<ProvisioningFetchState>({ fase: 'carregando' })

  useEffect(() => {
    if (!id) return
    setAccount(mockAccounts.find(a => a.id === id) ?? null)
    api.getAccount(id).then(a => { if (a) setAccount(a) }).catch(() => {})
  }, [id])

  const canView = useCanViewProvisioning(account?.id ?? '', account?.orgId ?? '')

  /**
   * `silencioso` = recarrega sem voltar ao skeleton. Usado pelo polling, que
   * roda a cada 5s — sem isso a tela piscaria em loop enquanto provisiona.
   */
  const loadProvisioning = useCallback((silencioso = false) => {
    if (!id) return
    if (!silencioso) setFetchState({ fase: 'carregando' })
    getProvisioning(id)
      .then(dados => setFetchState({ fase: 'ok', dados }))
      .catch(err => {
        if (err instanceof ProvisioningNotFoundError) {
          setFetchState({ fase: 'vazio', motivo: err.message })
        } else {
          setFetchState({
            fase: 'erro',
            mensagem: err instanceof Error ? err.message : 'Erro desconhecido ao carregar o provisionamento.',
            podeTentarNovamente: true,
          })
        }
      })
  }, [id])

  useEffect(() => {
    if (account && canView) loadProvisioning()
  }, [account, canView, loadProvisioning])

  // Polling só enquanto há trabalho em execução — Fase 1 não concluída ou
  // alguma solução da Fase 2 ainda provisionando. Ao atingir estado terminal
  // o hook para sozinho, sem requisições indefinidas.
  const emExecucao =
    fetchState.fase === 'ok' &&
    (fetchState.dados.status === 'PENDING' ||
      fetchState.dados.status === 'IN_PROGRESS' ||
      fetchState.dados.solucoes.some(s => s.estado === 'pendente' || s.estado === 'em-andamento'))

  useProvisioningPolling({
    enabled: Boolean(account) && canView && emExecucao,
    onPoll: () => loadProvisioning(true),
  })

  // ── Conta ainda não resolvida ──────────────────────────────
  if (account === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // ── Conta não encontrada ───────────────────────────────────
  if (account === null) {
    return (
      <div className="p-8">
        <EmptyState
          title="Conta não encontrada"
          description="Verifique se o link está correto ou se a conta foi removida."
        />
      </div>
    )
  }

  return (
    // h-[calc(100vh-4rem)] + overflow-y-auto: cria um contêiner de scroll próprio,
    // com altura limitada. O <main> do DetailLayout tem `overflow-auto` mas nunca
    // fica com altura travada (o wrapper dele usa min-h-screen), então quem rola
    // de fato é o `window` — isso também mantém o header do DetailLayout (voltar/
    // apps/avatar) sempre visível, já que só este contêiner interno rola.
    <div className="h-[calc(100vh-4rem)] overflow-y-auto bg-gray-50 flex flex-col">
      <div className="max-w-6xl w-full mx-auto px-8 py-8 flex flex-col gap-6 flex-1">
        {/* Header — rola junto com o conteúdo */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Building2 className="w-4 h-4" />
              <span>{account.name}</span>
            </div>
            <h1 className="text-[30px] font-bold leading-9 text-[#030712]">Provisionamento</h1>
            <p className="text-base text-[#6b7280] leading-6 max-w-2xl">
              Acompanhe o status de provisionamento deste tenant, identifique falhas por etapa e
              gerencie ações de infraestrutura.
            </p>
          </div>
          {fetchState.fase === 'ok' && (
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={STATUS_BADGE[fetchState.dados.status].variant} showIcon>
                {STATUS_BADGE[fetchState.dados.status].label}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => loadProvisioning()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Atualizar
              </Button>
            </div>
          )}
        </div>

        {/* AVISO: os gates de ação abaixo são apenas de UI. Quando o worker real
            expuser endpoints, a MESMA verificação precisa existir no servidor —
            esconder um botão não é controle de acesso. */}

        {!canView ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center max-w-sm">
              <ShieldOff className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-medium text-[#030712]">Sem permissão para ver esta tela</p>
              <p className="text-xs text-[#6b7280]">
                Fale com um administrador da organização ou da plataforma para solicitar acesso ao
                provisionamento desta conta.
              </p>
            </div>
          </div>
        ) : fetchState.fase === 'carregando' ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : fetchState.fase === 'vazio' ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="Nenhum registro de provisionamento"
              description={fetchState.motivo}
            />
          </div>
        ) : fetchState.fase === 'erro' ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm font-medium text-[#030712]">Não foi possível carregar o provisionamento</p>
              <p className="text-xs text-[#6b7280]">{fetchState.mensagem}</p>
              {fetchState.podeTentarNovamente && (
                <Button variant="outline" size="sm" onClick={loadProvisioning}>
                  Tentar novamente
                </Button>
              )}
            </div>
          </div>
        ) : (
          <ProvisioningContent
            snapshot={fetchState.dados}
            account={account}
            onToast={toast}
            onReload={loadProvisioning}
          />
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

// ── Conteúdo principal ─────────────────────────────────────────

function ProvisioningContent({
  snapshot,
  account,
  onToast,
  onReload,
}: {
  snapshot: ProvisioningSnapshot
  account: Account
  onToast: ReturnType<typeof useToast>['toast']
  onReload: () => void
}) {
  // Contratos e soluções são recursos da ORG (sem FK para account — ver
  // resolveAccountContracts/resolveAccountSolutionNames). Carregados aqui,
  // igual ao padrão de OrganizacaoDetailPage: mock imediato + API em background.
  const [contracts, setContracts] = useState<Contract[]>(() => mockContracts.filter(c => c.orgId === account.orgId))
  const [solutions, setSolutions] = useState<Solution[]>(() => mockSolutions.filter(s => s.orgId === account.orgId))

  useEffect(() => {
    Promise.allSettled([api.getContracts(account.orgId), api.getSolutions(account.orgId)]).then(([c, s]) => {
      if (c.status === 'fulfilled') setContracts(c.value)
      if (s.status === 'fulfilled') setSolutions(s.value)
    })
  }, [account.orgId])

  const linkedContracts = resolveAccountContracts(account.name, contracts)
  const linkedSolutionNames = resolveAccountSolutionNames(linkedContracts)
  const linkedSolutions = solutions.filter(s => linkedSolutionNames.has(s.name) && s.status !== 'Inativo')

  const summary = deriveSummary(snapshot.steps)

  return (
    <div className="flex flex-col gap-6">
      <ProvisioningSummaryBar summary={summary} />
      <TenantInfoCard
        tenant={snapshot.tenant}
        onCopy={() => onToast('Domínio copiado.', 'success')}
      />
      <ProvisioningStepsTimeline steps={snapshot.steps} />
      <Fase2ProvisioningCard fase1Status={snapshot.status} solucoes={snapshot.solucoes} />
      <ProvisioningActionsBar account={account} onToast={onToast} onReload={onReload} />
      <LinkedSolutionsCard solutions={linkedSolutions} accountName={account.name} />
      <ActiveContractsCard contracts={linkedContracts} accountName={account.name} />
    </div>
  )
}

// ── Ações: reprovisionar, health check, logs ───────────────────
//
// AVISO: os gates abaixo (useCanReprovisionTenant, useCanViewTenantLogs,
// useCanRunTenantHealthCheck) são apenas de UI. Quando o worker real expuser
// endpoints, a MESMA verificação precisa existir no servidor — esconder um
// botão não é controle de acesso.

function ProvisioningActionsBar({
  account,
  onToast,
  onReload,
}: {
  account: Account
  onToast: ReturnType<typeof useToast>['toast']
  onReload: () => void
}) {
  const canReprovision = useCanReprovisionTenant(account.id, account.orgId)
  const canViewLogs = useCanViewTenantLogs(account.id, account.orgId)
  const canRunHealthCheck = useCanRunTenantHealthCheck(account.id, account.orgId)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reprovisioning, setReprovisioning] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)

  async function handleReprovision() {
    // Segundo gate — defesa contra atalho de teclado / estado obsoleto do botão.
    if (!canReprovision) return
    setReprovisioning(true)
    try {
      const result = await reprovisionTenant(account.id)
      onToast(result.mensagem, result.aceito ? 'success' : 'error')
      onReload()
    } catch {
      onToast('Não foi possível solicitar o reprovisionamento.\nTente novamente.', 'error')
    } finally {
      setReprovisioning(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {(canReprovision || canViewLogs) && (
          <div className="flex items-center gap-3">
            {canReprovision && (
              <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} disabled={reprovisioning}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reprovisionar
              </Button>
            )}
            {canViewLogs && (
              <Button variant="outline" size="sm" onClick={() => setLogsOpen(true)}>
                <ScrollText className="w-3.5 h-3.5 mr-1.5" />
                Visualizar logs
              </Button>
            )}
          </div>
        )}

        <HealthCheckPanel accountId={account.id} canRun={canRunHealthCheck} onToast={onToast} />
      </div>

      <ConfirmDeleteModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        variant="reprovisionar"
        name={account.name}
        onConfirm={handleReprovision}
      />

      {canViewLogs && (
        <LogsSheet open={logsOpen} onClose={() => setLogsOpen(false)} accountId={account.id} />
      )}
    </>
  )
}
