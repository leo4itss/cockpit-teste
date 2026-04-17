import { useState, useRef, useLayoutEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'

interface Props {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
}

const STEPS = ['Iniciando', 'Banco de dados', 'Cloudflare', 'Recursos', 'Finalizando', 'Concluído']

export function ProvisioningDots({ status }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const completedSteps =
    status === 'PENDING'      ? 0
    : status === 'IN_PROGRESS'  ? 3
    : status === 'COMPLETED'    ? 6
    : 0 // FAILED

  const isFailed = status === 'FAILED'

  const statusLabel = {
    PENDING:     'Pendente',
    IN_PROGRESS: 'Em progresso',
    COMPLETED:   'Concluído',
    FAILED:      'Falhou',
  }[status]

  const etapa = status === 'COMPLETED'
    ? 'Concluído'
    : status === 'FAILED'
    ? 'Falhou'
    : STEPS[completedSteps] ?? ''

  useLayoutEffect(() => {
    if (showTooltip && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        top:  rect.top  + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
      })
    }
  }, [showTooltip])

  const tooltipContent = showTooltip && tooltipPos && createPortal(
    <div
      className="fixed bg-[#1f2937] rounded-md px-3 py-1.5 text-xs text-[#f9fafb] w-52 z-[9999] shadow-lg border border-gray-700 whitespace-normal"
      style={{
        top:       `${tooltipPos.top}px`,
        left:      `${tooltipPos.left}px`,
        transform: 'translate(-50%, -100%) translateY(-8px)',
        pointerEvents: 'none' as const,
      }}
    >
      <p className="font-semibold mb-1">Status do provisionamento</p>
      <p>• Status: <span className="font-medium">{statusLabel}</span></p>
      <p>• Etapa: <span className="font-medium">{etapa}</span></p>
      <p>• Início: <span className="font-medium">23/03/2026, 17:56:47</span></p>
      <p>• Fim: <span className="font-medium">23/03/2026, 17:57:57</span></p>
    </div>,
    document.body
  )

  return (
    <>
      <div
        ref={containerRef}
        className="inline-flex items-center"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {STEPS.map((_, i) => {
          const done    = i < completedSteps
          const dotColor = done
            ? isFailed ? 'bg-red-500' : 'bg-[#16a34a]'
            : 'bg-gray-200'
          // linha após o dot: verde se ambos os extremos estão completos
          const lineColor = (i < completedSteps - 1 && !isFailed) ? 'bg-[#16a34a]' : 'bg-gray-200'

          return (
            <Fragment key={i}>
              {/* dot */}
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${dotColor}`}>
                {done && isFailed  && <X     className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
                {done && !isFailed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
              </div>

              {/* separador (exceto após o último dot) */}
              {i < STEPS.length - 1 && (
                <div className={`w-[9px] h-px shrink-0 ${lineColor}`} />
              )}
            </Fragment>
          )
        })}
      </div>

      {tooltipContent}
    </>
  )
}
