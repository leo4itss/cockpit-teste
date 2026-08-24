import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { getProvisioningLogs, PROVISIONING_STEPS } from '@/services/provisioning'
import { formatarDataHora, FUSO_LOCAL } from '@/lib/datas'
import { EmptyState } from './ProvisioningCard'
import type { ProvisioningLogEntry, ProvisioningLogLevel, ProvisioningStepId } from '@/types'

const NIVEL_TONE: Record<ProvisioningLogLevel, string> = {
  debug: 'text-[#9ca3af]',
  info: 'text-[#2563eb]',
  warn: 'text-[#d97706]',
  error: 'text-[#dc2626]',
}

export function LogsSheet({
  open,
  onClose,
  accountId,
}: {
  open: boolean
  onClose: () => void
  accountId: string
}) {
  const [entries, setEntries] = useState<ProvisioningLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nivelFiltro, setNivelFiltro] = useState('')
  const [stepFiltro, setStepFiltro] = useState('')

  useEffect(() => {
    if (!open) return
    setEntries(null)
    setError(null)
    getProvisioningLogs(accountId)
      .then(page => setEntries(page.entradas))
      .catch(err => setError(err instanceof Error ? err.message : 'Erro ao carregar logs.'))
  }, [open, accountId])

  const filtered = (entries ?? []).filter(e => {
    if (nivelFiltro && e.nivel !== nivelFiltro) return false
    if (stepFiltro && e.stepId !== stepFiltro) return false
    return true
  })

  return (
    <Sheet open={open} onClose={onClose} title="Logs do provisionamento" width="w-[720px]">
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-center gap-3">
          <Select
            className="w-40"
            options={[
              { value: 'debug', label: 'Debug' },
              { value: 'info', label: 'Info' },
              { value: 'warn', label: 'Warning' },
              { value: 'error', label: 'Error' },
            ]}
            placeholder="Todos os níveis"
            value={nivelFiltro}
            onChange={e => setNivelFiltro(e.target.value)}
          />
          <Select
            className="w-56"
            options={PROVISIONING_STEPS.map(s => ({ value: s.id, label: s.nome }))}
            placeholder="Todas as etapas"
            value={stepFiltro}
            onChange={e => setStepFiltro(e.target.value)}
          />
        </div>

        {/* O fuso é declarado uma vez aqui, e não repetido em cada linha: numa
            lista densa isso viraria ruído. Sem a declaração, um horário de log
            é ambíguo na hora de investigar um incidente. */}
        <p className="text-xs text-[#9ca3af] -mt-1">
          Horários no fuso de quem abre a tela ({FUSO_LOCAL}).
        </p>

        {entries === null && !error && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <p className="text-sm text-[#6b7280]">{error}</p>
          </div>
        )}

        {entries !== null && !error && filtered.length === 0 && (
          <EmptyState title="Nenhum log encontrado" description="Ajuste os filtros ou tente novamente mais tarde." />
        )}

        {entries !== null && !error && filtered.length > 0 && (
          <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 font-mono text-xs">
            {filtered.map(entry => (
              <div key={entry.id} className="flex items-start gap-2 py-1.5 border-b border-[#f3f4f6]">
                <span className="text-[#9ca3af] shrink-0 w-40">{formatarDataHora(entry.timestamp)}</span>
                <span className={cn('shrink-0 w-14 font-semibold uppercase', NIVEL_TONE[entry.nivel])}>{entry.nivel}</span>
                <span className="text-[#9ca3af] shrink-0 w-24 truncate">
                  {stepName(entry.stepId)}
                </span>
                <span className="text-[#030712] flex-1 whitespace-pre-wrap">{entry.mensagem}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}

function stepName(stepId: ProvisioningStepId | null): string {
  if (!stepId) return 'orquestrador'
  return PROVISIONING_STEPS.find(s => s.id === stepId)?.nome ?? stepId
}
