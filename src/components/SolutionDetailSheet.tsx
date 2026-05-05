import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, History } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import type { Solution, Plan, Componente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  solution: Solution | null
  componentes?: Componente[]
  onEdit?: () => void
}

function Field({ label, value, required }: { label: string; value?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-[#030712]">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="h-9 w-full rounded-md border border-[#e5e7eb] bg-[#f9fafb] px-3 flex items-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
        <span className="text-sm text-[#030712] truncate">{value || '—'}</span>
      </div>
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

function PlanItem({ plan, inactive = false }: { plan: Plan; inactive?: boolean }) {
  const [expanded, setExpanded] = useState(!inactive)

  const licensingParts = plan.licensings.map(l => {
    const unidade = l.tipoLicencaUnidade ?? ''
    const min = l.valorMinimo?.trim()
    const max = l.valorMaximo?.trim()
    const val = l.valor?.trim()
    if (min && max) return `${min}–${max} ${unidade}`.trim()
    if (min) return `${min} ${unidade}`.trim()
    if (max) return `Até ${max} ${unidade}`.trim()
    if (val) return `${val} ${unidade}`.trim()
    return l.tipoLicencaNome || l.tipoLicencaId
  })

  const licensingLine = licensingParts.length > 0 ? licensingParts.join(' | ') : null

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${inactive ? 'border-[#e5e7eb] opacity-60' : 'border-[#e5e7eb]'}`}>
      <div className="flex items-start gap-3 px-5 py-4">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[#6b7280] shrink-0 mt-0.5"
        >
          {expanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </button>
        <div className="flex flex-col flex-1 min-w-0 gap-1">
          {/* Nome + badges de versão e status */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-[#030712]">{plan.name}</p>
            {plan.versao && (
              <span className="text-xs font-medium text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] px-1.5 py-0.5 rounded">
                v{plan.versao}
              </span>
            )}
            {inactive ? (
              <span className="text-xs font-medium text-[#9ca3af] bg-[#f9fafb] border border-[#e5e7eb] px-1.5 py-0.5 rounded">
                Inativo
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#16a34a] bg-[#dcfce7] px-1.5 py-0.5 rounded-full">
                Ativa
              </span>
            )}
          </div>
          {plan.description && (
            <p className="text-sm text-[#6b7280] leading-5">{plan.description}</p>
          )}
          {inactive && plan.criadoEm && (
            <p className="text-xs text-[#9ca3af]">
              Criado em {new Date(plan.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {expanded && licensingLine && (
        <div className="border-t border-[#e5e7eb] px-5 py-4 flex flex-col gap-1">
          <p className="text-sm font-bold text-[#030712]">Modelo de licenciamento</p>
          <p className="text-sm text-[#6b7280]">{licensingLine}</p>
        </div>
      )}
    </div>
  )
}

export function SolutionDetailSheet({ open, onClose, solution, componentes = [], onEdit }: Props) {
  if (!solution) return null

  const componentesVinculados = componentes.filter(c =>
    (solution.componenteIds ?? []).includes(c.id)
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhe da solução"
      width="w-[640px]"
      headerAction={onEdit ? (
        <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
      ) : undefined}
    >
      <div className="flex flex-col gap-6">

        {/* Avatar + nome + status */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-base font-bold text-[#6b7280] shrink-0 overflow-hidden">
            <span>{solution.name.charAt(0)}</span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-base font-semibold text-[#030712] leading-6 truncate">{solution.name}</p>
            <StatusBadge status={solution.status} />
          </div>
        </div>

        <Divider />

        {/* Informações básicas */}
        <div className="flex flex-col gap-5">
          <SectionTitle>Informações básicas</SectionTitle>
          <div className="flex flex-col gap-4">
            <Field label="Nome da instância da solução" value={solution.name} required />
            <Field label="Descrição" value={solution.description} />
            <Field label="Data de cadastro" value={solution.createdAt} />
            <Field label="Arquiteto PAS responsável" value={solution.arquitetoPAS} />
          </div>
        </div>

        <Divider />

        {/* Componentes */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Componentes</SectionTitle>
          {componentesVinculados.length === 0 ? (
            <p className="text-sm text-[#6b7280] py-2">
              Nenhum componente vinculado a esta solução.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {componentesVinculados.map(c => (
                <div
                  key={c.id}
                  className="flex flex-col gap-0.5 px-4 py-3 border border-[#e5e7eb] rounded-lg"
                >
                  <p className="text-sm font-semibold text-[#030712]">{c.nome}</p>
                  {c.descricao && (
                    <p className="text-sm text-[#6b7280]">{c.descricao}</p>
                  )}
                </div>
              ))}
            </div>
          )}
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
                {solution.link01 && <Field label="Link 01" value={solution.link01} />}
                {solution.titleLink01 && <Field label="Título do Link 01" value={solution.titleLink01} />}
                {solution.link02 && <Field label="Link 02" value={solution.link02} />}
                {solution.titleLink02 && <Field label="Título do Link 02" value={solution.titleLink02} />}
                {solution.marketplaceStatus && <Field label="Status" value={solution.marketplaceStatus} />}
              </>
            )}
          </div>
        </div>

      </div>
    </Sheet>
  )
}
