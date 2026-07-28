/**
 * ProvisionamentoPage — Tela de Detalhes de Provisionamento de um tenant.
 *
 * Rota: /contas/:id/provisionamento
 *
 * Consome o contrato mockado em `src/services/provisioning.ts` (swap point
 * único para o pas-cockpit-worker real). Ver plano PAS-2409.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Loader2, ShieldOff, AlertTriangle, RefreshCw, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/provisionamento/ProvisioningCard'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { useCanViewProvisioning } from '@/authz/hooks'
import { getProvisioning, ProvisioningNotFoundError } from '@/services/provisioning'
import { api } from '@/api/client'
import { accounts as mockAccounts } from '@/data/mock'
import type { Account, ProvisioningFetchState, ProvisioningOverallStatus, ProvisioningSnapshot } from '@/types'

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

  const loadProvisioning = useCallback(() => {
    if (!id) return
    setFetchState({ fase: 'carregando' })
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-6xl w-full mx-auto px-8 py-8 flex flex-col gap-6 flex-1">
        {/* Header */}
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
              <Button variant="outline" size="sm" onClick={loadProvisioning}>
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
          />
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

// ── Conteúdo (preenchido nos passos seguintes) ────────────────

function ProvisioningContent({
  snapshot,
}: {
  snapshot: ProvisioningSnapshot
  account: Account
  onToast: ReturnType<typeof useToast>['toast']
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-[#6b7280]">
        Tenant <Link to={`/organizacoes/${snapshot.tenant.orgId}`} className="text-[#2563eb] hover:underline">
          {snapshot.tenant.orgNome}
        </Link> — conteúdo detalhado em construção.
      </p>
    </div>
  )
}
