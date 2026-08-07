import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, SectionTitle, Divider } from './ProvisioningCard'
import { cn } from '@/lib/utils'
import { runHealthCheck, PROVISIONING_STEPS } from '@/services/provisioning'
import type { HealthCheckResult, HealthCheckState } from '@/types'

const ESTADO_ICON: Record<HealthCheckState, typeof CheckCircle2> = {
  ok: CheckCircle2,
  degradado: AlertTriangle,
  falha: XCircle,
  'nao-verificado': HelpCircle,
}

const ESTADO_TONE: Record<HealthCheckState, string> = {
  ok: 'text-[#16a34a]',
  degradado: 'text-[#d97706]',
  falha: 'text-[#dc2626]',
  'nao-verificado': 'text-[#9ca3af]',
}

const ESTADO_LABEL: Record<HealthCheckState, string> = {
  ok: 'OK',
  degradado: 'Degradado',
  falha: 'Falha',
  'nao-verificado': 'Não verificado',
}

export function HealthCheckPanel({
  accountId,
  canRun,
  onToast,
}: {
  accountId: string
  canRun: boolean
  onToast: (message: string, variant?: 'success' | 'error' | 'warning') => void
}) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<HealthCheckResult | null>(null)

  function handleRun() {
    setRunning(true)
    runHealthCheck(accountId)
      .then(res => {
        setResult(res)
        onToast(
          res.estadoGeral === 'ok'
            ? 'Verificação de saúde concluída.\nTodos os recursos estão OK.'
            : 'Verificação de saúde concluída com pendências.\nUm ou mais recursos apresentaram problema.',
          res.estadoGeral === 'ok' ? 'success' : res.estadoGeral === 'falha' ? 'error' : 'warning',
        )
      })
      .catch(() => onToast('Não foi possível executar a verificação de saúde.\nTente novamente.', 'error'))
      .finally(() => setRunning(false))
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Saúde do tenant</SectionTitle>
        <Button variant="outline" size="sm" onClick={handleRun} disabled={!canRun || running}>
          {running ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
          {running ? 'Verificando…' : 'Verificar saúde'}
        </Button>
      </div>
      <Divider />

      {!result ? (
        <p className="text-sm text-[#9ca3af]">
          {canRun ? 'Nenhuma verificação executada ainda.' : 'Você não tem permissão para executar o health check deste tenant.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[#6b7280]">
            Última verificação: {new Date(result.executadoEm).toLocaleString('pt-BR')} ({result.duracaoMs}ms)
          </p>
          {PROVISIONING_STEPS.map(def => {
            const item = result.itens.find(i => i.id === def.id)
            if (!item) return null
            const Icon = ESTADO_ICON[item.estado]
            return (
              <div key={def.id} className="flex items-center gap-2 text-sm">
                <Icon className={cn('w-4 h-4 shrink-0', ESTADO_TONE[item.estado])} />
                <span className="text-[#030712] font-medium w-40 shrink-0">{def.nome}</span>
                <span className={cn('text-xs font-medium w-28 shrink-0', ESTADO_TONE[item.estado])}>{ESTADO_LABEL[item.estado]}</span>
                <span className="text-xs text-[#6b7280] flex-1 truncate">{item.mensagem}</span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
