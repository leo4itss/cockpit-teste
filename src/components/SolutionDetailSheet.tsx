import { useState } from 'react'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import type { Solution, Plan, Componente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  solution: Solution | null
  componentes?: Componente[]
  onEdit?: () => void
  onInativar?: () => void
  onAtivar?: () => void
  onExcluir?: () => void
}

function Field({ label, value, required }: { label: string; value?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#030712]">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="h-9 w-full rounded-md bg-[#f3f4f6] px-3 flex items-center">
        <span className="text-sm text-[#6b7280] truncate">{value || '—'}</span>
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
  if (status === 'Ativo' || status === 'Criado') {
    return <Badge variant="success" showIcon>{status}</Badge>
  }
  return <Badge variant="secondary" showIcon>{status}</Badge>
}

function PlanItem({ plan, inactive = false }: { plan: Plan; inactive?: boolean }) {
  const [expanded, setExpanded] = useState(true)

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

  /* ── card inativo (histórico) ──────────────────────── */
  if (inactive) {
    return (
      <div className="bg-white border border-[#e5e7eb] rounded-lg px-4 py-3 flex flex-col gap-1 opacity-70">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-[#374151]">{plan.name}</p>
          <span className="text-[11px] font-medium text-[#9ca3af] bg-white border border-[#e5e7eb] px-1.5 py-0.5 rounded leading-none">
              v{plan.versao ?? 1}
            </span>
          <span className="text-[11px] font-medium text-[#9ca3af] bg-white border border-[#e5e7eb] px-1.5 py-0.5 rounded leading-none">
            Inativo
          </span>
        </div>
        {licensingLine && (
          <p className="text-xs text-[#9ca3af] leading-5">{licensingLine}</p>
        )}
        {plan.criadoEm && (
          <p className="text-[11px] text-[#d1d5db] mt-0.5">
            Vigente de {new Date(plan.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
    )
  }

  /* ── card ativo (versão vigente) ───────────────────── */
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[#6b7280] hover:text-[#030712] transition-colors shrink-0"
        >
          {expanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />
          }
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <p className="text-sm font-bold text-[#030712]">{plan.name}</p>
          <span className="text-[11px] font-medium text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] px-1.5 py-0.5 rounded leading-none">
              v{plan.versao ?? 1}
            </span>
          <Badge variant="success" showIcon>Ativa</Badge>
          {plan.description && (
            <p className="w-full text-xs text-[#6b7280] leading-4 mt-0.5">{plan.description}</p>
          )}
        </div>
      </div>

      {expanded && licensingLine && (
        <div className="border-t border-[#e5e7eb] bg-[#fafafa] px-5 py-3 flex flex-col gap-1">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Modelo de licenciamento</p>
          <p className="text-sm text-[#030712]">{licensingLine}</p>
        </div>
      )}
    </div>
  )
}

export function SolutionDetailSheet({ open, onClose, solution, componentes = [], onEdit, onInativar, onAtivar, onExcluir }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false)

  if (!solution) return null

  const componentesVinculados = componentes.filter(c =>
    (solution.componenteIds ?? []).includes(c.id)
  )

  // Separa planos ativos (visíveis) dos inativados (histórico)
  const activePlans = solution.plans.filter(p => !p.statusVersao || p.statusVersao === 'ativo')
  const inactivePlans = [...solution.plans.filter(p => p.statusVersao === 'inativo')].reverse()

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhe da solução"
      width="w-[640px]"
      headerAction={
        <div className="flex items-center gap-2">
          {onEdit && <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>}
          {solution.status === 'Inativo'
            ? onAtivar && <Button variant="outline" size="sm" className="text-green-700" onClick={onAtivar}>Ativar</Button>
            : <>
                {onInativar && <Button variant="outline" size="sm" className="text-amber-600" onClick={onInativar}>Inativar</Button>}
                {onExcluir && <Button variant="outline" size="sm" className="text-red-600" onClick={onExcluir}>Excluir</Button>}
              </>}
        </div>
      }
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
            <Field label="Nome do objeto da solução" value={solution.name} required />
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

          {/* Planos ativos (versões vigentes) */}
          {activePlans.length === 0 ? (
            <p className="text-sm text-[#6b7280]">Nenhum plano ativo.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activePlans.map((plan, i) => (
                <PlanItem key={i} plan={plan} />
              ))}
            </div>
          )}

          {/* Histórico de versões (colapsável) */}
          {inactivePlans.length > 0 && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setHistoryOpen(v => !v)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-[#f9fafb] hover:bg-[#f3f4f6] border border-[#e5e7eb] text-sm text-[#6b7280] hover:text-[#030712] transition-colors"
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left">Histórico de versões</span>
                <span className="bg-white text-[#6b7280] text-xs px-1.5 py-0.5 rounded-full border border-[#e5e7eb]">
                  {inactivePlans.length}
                </span>
                {historyOpen
                  ? <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                }
              </button>

              {historyOpen && (
                <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-[#e5e7eb] ml-1">
                  {inactivePlans.map((plan, i) => (
                    <PlanItem key={i} plan={plan} inactive />
                  ))}
                </div>
              )}
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
