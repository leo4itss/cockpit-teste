import { cn } from '@/lib/utils'
import type { ProvisioningSummary } from '@/types'

export function ProvisioningSummaryBar({ summary }: { summary: ProvisioningSummary }) {
  const cells = [
    { label: 'Concluídos', value: summary.concluidos, tone: 'text-[#16a34a]' },
    { label: 'Em andamento', value: summary.emAndamento, tone: 'text-[#2563eb]' },
    { label: 'Pendentes', value: summary.pendentes, tone: 'text-[#6b7280]' },
    { label: 'Com falha', value: summary.comErro, tone: summary.comErro > 0 ? 'text-[#dc2626]' : 'text-[#6b7280]' },
  ]

  return (
    <div className="flex divide-x divide-gray-200 bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {cells.map(c => (
        <div key={c.label} className="flex-1 px-6 py-4 min-w-0">
          <p className={cn('text-2xl font-bold leading-8', c.tone)}>{c.value}</p>
          <p className="text-xs text-[#6b7280] mt-0.5">{c.label} de {summary.total}</p>
        </div>
      ))}
    </div>
  )
}
