import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
}

const STEPS = ['Iniciando', 'Banco de dados', 'Cloudflare', 'Recursos', 'Concluído']

export function ProvisioningDots({ status }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const completedSteps =
    status === 'PENDING' ? 0
    : status === 'IN_PROGRESS' ? 3
    : status === 'COMPLETED' ? 5
    : 0

  const statusLabel = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  }[status]

  const etapa = status === 'COMPLETED' ? 'Concluído' : status === 'FAILED' ? 'Falhou' : STEPS[completedSteps] || ''

  useLayoutEffect(() => {
    if (showTooltip && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
      })
    }
  }, [showTooltip])

  const tooltipContent = showTooltip && tooltipPos && createPortal(
    <div
      className="fixed bg-[#1f2937] rounded-md px-3 py-1.5 text-xs text-[#f9fafb] w-52 z-[9999] shadow-lg border border-gray-700 whitespace-normal"
      style={{
        top: `${tooltipPos.top}px`,
        left: `${tooltipPos.left}px`,
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
        className="inline-flex items-center gap-1"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full inline-block ${
              i < completedSteps
                ? status === 'FAILED' ? 'bg-red-500' : 'bg-green-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {tooltipContent}
    </>
  )
}
