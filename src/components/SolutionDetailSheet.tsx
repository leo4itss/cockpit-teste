import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Check } from 'lucide-react'
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

function PlanItem({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const licensingText = plan.licensings.length > 0
    ? plan.licensings.map(l => {
        const range = [l.valorMinimo, l.valorMaximo].filter(Boolean).join('–')
        const nome = l.tipoLicencaNome || l.tipoLicencaId
        return range ? `${nome}: ${range} ${l.tipoLicencaUnidade ?? ''}`.trim() : nome
      }).join(' · ')
    : null

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

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

        {/* ⋮ dropdown — abre opção Editar (redireciona para EditSolutionSheet) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            className="text-[#6b7280] shrink-0 w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 bg-white border border-[#e5e7eb] rounded-md shadow-lg py-1 min-w-[148px]">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#030712] hover:bg-gray-50 transition-colors"
                onClick={() => { setMenuOpen(false); onEdit() }}
              >
                Editar solução
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && licensingText && (
        <>
          <Divider />
          <div className="px-1 py-2">
            <Field label="Tipos de licença" value={licensingText} />
          </div>
        </>
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
            <Field label="Apelido da solução" value={solution.name} />
            <Field label="Descrição" value={solution.description} />
            <Field label="Data de cadastro" value={solution.createdAt} />
            <Field label="Arquiteto PAS responsável" value={solution.arquitetoPAS} />
          </div>
        </div>

        <Divider />

        {/* Componentes */}
        {componentesVinculados.length > 0 && (
          <>
            <div className="flex flex-col gap-4">
              <SectionTitle>Componentes</SectionTitle>
              <div className="flex flex-col gap-2">
                {componentesVinculados.map(c => (
                  <div key={c.id} className="flex flex-col gap-0.5 px-4 py-3 border border-[#e5e7eb] rounded-md">
                    <p className="text-sm font-medium text-[#030712]">{c.nome}</p>
                    {c.descricao && <p className="text-xs text-[#6b7280]">{c.descricao}</p>}
                  </div>
                ))}
              </div>
            </div>
            <Divider />
          </>
        )}

        {/* Planos */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Planos</SectionTitle>
          {solution.plans.length === 0 ? (
            <p className="text-sm text-[#6b7280]">Nenhum plano cadastrado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {solution.plans.map((plan, i) => (
                <PlanItem key={i} plan={plan} onEdit={onEdit ?? (() => {})} />
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
            {/* Exibe campos de link sempre que houver dados, independente do status */}
            {(solution.link01 || solution.link02 || solution.marketplaceStatus) && (
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
