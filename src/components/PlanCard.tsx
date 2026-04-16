import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import type { Plan, Licensing } from '@/types'

interface Props {
  plan: Plan
  onRemove: () => void
}

function formatLicensing(l: Licensing): string {
  const nome = l.tipoLicencaNome || l.tipoLicencaId
  const unidade = l.tipoLicencaUnidade ?? ''
  const min = l.valorMinimo?.trim()
  const max = l.valorMaximo?.trim()

  let range = ''
  if (min && max) {
    range = `${min}–${max} ${unidade}`.trim()
  } else if (min) {
    range = `${min} ${unidade}`.trim()
  } else if (max) {
    range = `Até ${max} ${unidade}`.trim()
  }

  return range ? `${nome}: ${range}` : nome
}

export function PlanCard({ plan, onRemove }: Props) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-0.5 text-[#6b7280] hover:text-[#030712] transition-colors shrink-0"
          aria-label={expanded ? 'Recolher' : 'Expandir'}
        >
          {expanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#030712] leading-5">{plan.name}</p>
          {plan.description && (
            <p className="text-xs text-[#6b7280] leading-4 mt-0.5">{plan.description}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="mt-0.5 text-[#6b7280] hover:text-red-500 transition-colors shrink-0"
          aria-label="Remover plano"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Body expandido */}
      {expanded && plan.licensings.length > 0 && (
        <div className="px-4 pb-4 pt-1 border-t border-[#e5e7eb] bg-[#fafafa]">
          <p className="text-xs font-semibold text-[#030712] mb-2">Modelo de licenciamento</p>
          <ul className="flex flex-col gap-1">
            {plan.licensings.map((l, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-[#6b7280]">
                <span className="mt-[3px] w-1 h-1 rounded-full bg-[#6b7280] shrink-0" />
                {formatLicensing(l)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
