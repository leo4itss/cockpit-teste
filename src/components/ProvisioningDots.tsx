import { Fragment } from 'react'
import { Check, X } from 'lucide-react'
import { Tooltip } from './ui/Tooltip'
import { PROVISIONING_STEPS, deriveStepsFromStatus, PROVISIONING_STATUS_BADGE } from '@/services/provisioning'
import { formatarDataHora } from '@/lib/datas'
import type { ProvisioningOverallStatus, ProvisioningStep, ProvisioningStepDef } from '@/types'

interface Props {
  /** Status consolidado. Continua sendo a única prop obrigatória. */
  status: ProvisioningOverallStatus
  /** Estados reais por passo. Quando ausente, derivados de `status`. */
  steps?: ProvisioningStep[]
  /** Catálogo de passos exibido. Default: os 5 passos do worker de provisionamento. */
  catalog?: readonly ProvisioningStepDef[]
  iniciadoEm?: string | null
  finalizadoEm?: string | null
  /** Título do tooltip. Default: 'Status do provisionamento'. */
  tooltipTitulo?: string
}

export function ProvisioningDots({
  status,
  steps,
  catalog = PROVISIONING_STEPS,
  iniciadoEm = null,
  finalizadoEm = null,
  tooltipTitulo = 'Status do provisionamento',
}: Props) {
  const resolvedSteps = steps ?? deriveStepsFromStatus(status)
  const errorIndex = resolvedSteps.findIndex(s => s.estado === 'erro')
  const currentEtapa =
    status === 'COMPLETED' ? 'Concluído'
    : status === 'FAILED' ? (catalog.find(d => d.id === resolvedSteps[errorIndex]?.id)?.nome ?? 'Falha')
    : (catalog.find(d => d.id === resolvedSteps.find(s => s.estado === 'em-andamento' || s.estado === 'pendente')?.id)?.nome ?? '—')

  return (
    <Tooltip
      content={
        <>
          <p className="font-semibold mb-1">{tooltipTitulo}</p>
          <p>• Status: <span className="font-medium">{PROVISIONING_STATUS_BADGE[status].label}</span></p>
          <p>• Etapa: <span className="font-medium">{currentEtapa}</span></p>
          <p>• Início: <span className="font-medium">{formatarDataHora(iniciadoEm)}</span></p>
          <p>• Fim: <span className="font-medium">{formatarDataHora(finalizadoEm)}</span></p>
        </>
      }
    >
      {catalog.map((def, i) => {
        const step = resolvedSteps.find(s => s.id === def.id)
        const estado = step?.estado ?? 'pendente'
        const done = estado === 'criado'
        const failed = estado === 'erro'

        const dotColor = done ? 'bg-[#16a34a]' : failed ? 'bg-red-500' : 'bg-gray-200'
        const nextEstado = catalog[i + 1] ? resolvedSteps.find(s => s.id === catalog[i + 1].id)?.estado : undefined
        const lineColor = done && nextEstado === 'criado' ? 'bg-[#16a34a]' : 'bg-gray-200'

        return (
          <Fragment key={def.id}>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${dotColor}`}>
              {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
              {failed && <X className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
            </div>
            {i < catalog.length - 1 && (
              <div className={`w-[9px] h-px shrink-0 ${lineColor}`} />
            )}
          </Fragment>
        )
      })}
    </Tooltip>
  )
}
