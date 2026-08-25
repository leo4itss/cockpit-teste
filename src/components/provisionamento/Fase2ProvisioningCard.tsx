import { useState } from 'react'
import { CheckCircle2, Clock, Loader2, XCircle, Lock, FileQuestion, RotateCcw } from 'lucide-react'
import { Card, SectionTitle, Divider } from './ProvisioningCard'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { deriveFase2Status, PROVISIONING_STEP_LABEL } from '@/services/provisioning'
import { ProvisioningErrorBlock } from './ProvisioningErrorBlock'
import type { ProvisioningOverallStatus, SolutionProvisioning } from '@/types'

const ESTADO_ICON: Record<SolutionProvisioning['estado'], typeof CheckCircle2> = {
  criado: CheckCircle2,
  pendente: Clock,
  'em-andamento': Loader2,
  erro: XCircle,
}

const ESTADO_TONE: Record<SolutionProvisioning['estado'], string> = {
  criado: 'text-[#16a34a]',
  pendente: 'text-[#9ca3af]',
  'em-andamento': 'text-[#2563eb]',
  erro: 'text-[#dc2626]',
}

function SolutionRow({
  solucao,
  podeReexecutar,
  onRetry,
}: {
  solucao: SolutionProvisioning
  /** Gate de permissão. O `podeReexecutar` do próprio erro é checado à parte. */
  podeReexecutar: boolean
  onRetry?: (solucaoNome: string) => Promise<void>
}) {
  const Icon = ESTADO_ICON[solucao.estado]
  const hasDetails = Boolean(solucao.detalhes && Object.keys(solucao.detalhes).length > 0)
  const [reexecutando, setReexecutando] = useState(false)

  // Três condições: a permissão do usuário, o worker declarar a etapa
  // reexecutável, e haver quem trate a ação nesta tela.
  const mostraRetry = Boolean(
    solucao.erro?.podeReexecutar && podeReexecutar && onRetry,
  )

  async function handleRetry() {
    if (!onRetry) return
    setReexecutando(true)
    try {
      await onRetry(solucao.solucaoNome)
    } finally {
      setReexecutando(false)
    }
  }

  return (
    <div className="flex flex-col py-3">
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', ESTADO_TONE[solucao.estado], solucao.estado === 'em-andamento' && 'animate-spin')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#030712]">{solucao.solucaoNome}</p>
            <span className={cn('text-xs font-medium', ESTADO_TONE[solucao.estado])}>{PROVISIONING_STEP_LABEL[solucao.estado]}</span>
          </div>
          {hasDetails && (
            <p className="text-xs text-[#6b7280] mt-0.5">
              {Object.entries(solucao.detalhes!).map(([k, v], i) => (
                <span key={k}>{i > 0 && ' · '}{k}: {v}</span>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* Bloco de erro — sempre visível, mesmo padrão da Fase 1. É aqui que
          vive a única ação de recuperação da Fase 2: reexecutar UMA solução,
          sem tocar no contrato. */}
      {solucao.erro && (
        <ProvisioningErrorBlock
          erro={solucao.erro}
          className="ml-8 mt-2"
          acao={mostraRetry ? (
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={reexecutando}>
              {reexecutando
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />}
              {reexecutando ? 'Reexecutando…' : 'Tentar novamente'}
            </Button>
          ) : undefined}
        />
      )}
    </div>
  )
}

/**
 * Fase 2 — workflow `solutionPublicationByContract`. Disparada pela criação
 * do contrato, provisiona cada solução coberta e libera acesso. Não mexe em
 * DNS/Ingress (isso é Fase 1). Exige Fase 1 concluída — regra confirmada com
 * o arquiteto do worker: "provisionar solução só pode ocorrer se já tem
 * conta e contrato".
 */
export function Fase2ProvisioningCard({
  fase1Status,
  solucoes,
}: {
  fase1Status: ProvisioningOverallStatus
  solucoes: SolutionProvisioning[]
}) {
  const fase2Status = deriveFase2Status(fase1Status, solucoes)

  return (
    <Card className="flex flex-col gap-1">
      <SectionTitle>Fase 2 — Provisionamento por contrato</SectionTitle>
      <Divider />

      {fase2Status === 'bloqueada' ? (
        <div className="flex items-center gap-3 py-6">
          <Lock className="w-5 h-5 text-gray-300 shrink-0" />
          <p className="text-sm text-[#9ca3af]">
            Aguardando conclusão da Fase 1 para iniciar o provisionamento de soluções.
          </p>
        </div>
      ) : fase2Status === 'sem-contrato' ? (
        <div className="flex items-center gap-3 py-6">
          <FileQuestion className="w-5 h-5 text-gray-300 shrink-0" />
          <p className="text-sm text-[#9ca3af]">
            Nenhum contrato ativo — a Fase 2 inicia quando um contrato for criado para esta conta.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#f3f4f6]">
          {solucoes.map(s => <SolutionRow key={s.solucaoNome} solucao={s} />)}
        </div>
      )}
    </Card>
  )
}
