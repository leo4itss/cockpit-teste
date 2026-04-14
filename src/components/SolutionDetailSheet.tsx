import { useState } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Check } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import type { Solution, Plan } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  solution: Solution | null
  onEdit?: () => void
}

function Field({ label, value, isLink }: { label: string; value?: string; isLink?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-[#030712]">{label}</p>
      <p className={`text-sm ${isLink ? 'text-[#030712]' : 'text-[#6b7280]'}`}>{value || '—'}</p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
  )
}

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

function StatusBadge({ status }: { status: Solution['status'] }) {
  if (status === 'Criado') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16a34a]">
        <span className="w-4 h-4 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
        </span>
        Criado
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function PlanItem({ plan }: { plan: Plan }) {
  const [expanded, setExpanded] = useState(false)

  const licensingLabel = plan.licensings.length > 0
    ? plan.licensings.map(l => [l.tipoLicenca, l.slots, l.modelo, l.usuarios].filter(Boolean).join(' | ')).join('; ')
    : null

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-md flex flex-col gap-2 pt-2 pb-4 px-5">
      <div className="flex items-center gap-4 py-2">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[#6b7280] shrink-0"
        >
          {expanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#030712]">{plan.name}</p>
          {plan.description && (
            <p className="text-xs text-[#6b7280]">{plan.description}</p>
          )}
        </div>
        <button className="text-[#6b7280] shrink-0 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {expanded && licensingLabel && (
        <>
          <Divider />
          <div className="px-1 py-2">
            <Field label="Modelo de licenciamento" value={licensingLabel} />
          </div>
        </>
      )}
    </div>
  )
}

export function SolutionDetailSheet({ open, onClose, solution, onEdit }: Props) {
  if (!solution) return null

  return (
    <Sheet open={open} onClose={onClose} title="Detalhe da solução" width="w-[768px]">
      <div className="flex flex-col gap-6">

        {/* Avatar + nome + status + botão editar */}
        <div className="flex items-start gap-7">
          <div className="w-12 h-12 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-sm font-bold text-[#6b7280] shrink-0">
            {solution.name.charAt(0)}
          </div>
          <div className="flex flex-col flex-1 min-w-0 gap-3">
            <p className="text-base font-bold text-[#030712] leading-6">
              {solution.name}
            </p>
            <StatusBadge status={solution.status} />
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
        </div>

        <Divider />

        {/* Informações básicas */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Informações básicas</SectionTitle>
          <div className="flex flex-col gap-4">
            <Field label="Tipo da solução" value={solution.type} />
            <Field label="Apelido da solução" value={solution.name} />
            <Field label="Descrição" value={solution.description} />
            <Field label="Data de cadastro" value={solution.createdAt} />
            <Field label="Arquiteto PAS responsável" value={solution.arquitetoPAS} />
          </div>
        </div>

        <Divider />

        {/* Planos */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Planos</SectionTitle>
          {solution.plans.length === 0 ? (
            <p className="text-sm text-[#6b7280]">Nenhum plano cadastrado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {solution.plans.map((plan, i) => (
                <PlanItem key={i} plan={plan} />
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Marketplace */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Marketplace</SectionTitle>
          <div className="flex flex-col gap-4">
            <Field label="Marketplace" value={solution.marketplace} />
            {solution.marketplace === 'Ativo' && (
              <>
                <Field label="Link 01" value={solution.link01} isLink />
                <Field label="Título do Link 01" value={solution.titleLink01} />
                <Field label="Link 02" value={solution.link02} isLink />
                <Field label="Título do Link 02" value={solution.titleLink02} />
                <Field label="Status" value={solution.marketplaceStatus} />
              </>
            )}
          </div>
        </div>

      </div>
    </Sheet>
  )
}
