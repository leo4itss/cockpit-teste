import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, MoreVertical, CircleAlert, Pencil, Trash2, Plus, Puzzle } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { NewPlanDialog } from './NewPlanDialog'
import { ComponenteSelector } from './ComponenteSelector'
import { ComponenteSelecaoSheet } from './ComponenteSelecaoSheet'
import { ComponenteSheet } from './ComponenteSheet'
import { api } from '@/api/client'
import type { Solution, Plan, TipoLicenca, Componente, Contract } from '@/types'

const THRESHOLD_INLINE = 5  // ≤ este valor: inline; > este valor: sheet

interface Props {
  open: boolean
  onClose: () => void
  solution: Solution | null
  onSave: (solution: Solution) => void
  onDelete?: () => void
  tiposLicenca: TipoLicenca[]
  componentes: Componente[]
  onComponenteCreated: (c: Componente) => void
  contracts?: Contract[]
}

/* ── sub-components ─────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
  )
}

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

function PlanCard({
  plan,
  onEdit,
  onRemove,
}: {
  plan: Plan
  onEdit: () => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const licensings = plan.licensings.map(l => {
    const nome = l.tipoLicencaNome || l.tipoLicencaId
    const unidade = l.tipoLicencaUnidade ?? ''
    const min = l.valorMinimo?.trim()
    const max = l.valorMaximo?.trim()
    let range = ''
    if (min && max) range = `${min}–${max} ${unidade}`.trim()
    else if (min) range = `${min} ${unidade}`.trim()
    else if (max) range = `Até ${max} ${unidade}`.trim()
    return range ? `${nome}: ${range}` : nome
  })

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
    <div className="border border-[#e5e7eb] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-0.5 text-[#6b7280] hover:text-[#030712] transition-colors shrink-0"
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

        {/* Dropdown menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-[#6b7280] transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-50 bg-white border border-[#e5e7eb] rounded-md shadow-lg py-1 min-w-[148px]">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#030712] hover:bg-gray-50 transition-colors"
                onClick={() => { setMenuOpen(false); onEdit() }}
              >
                <Pencil className="w-4 h-4 text-[#6b7280]" />
                Editar
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => { setMenuOpen(false); onRemove() }}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Licensings expandidos */}
      {expanded && licensings.length > 0 && (
        <div className="px-4 pb-4 pt-1 border-t border-[#e5e7eb] bg-[#fafafa]">
          <p className="text-xs font-semibold text-[#030712] mb-2">Modelo de licenciamento</p>
          <ul className="flex flex-col gap-1">
            {licensings.map((text, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-[#6b7280]">
                <span className="mt-[3px] w-1 h-1 rounded-full bg-[#6b7280] shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ── options ─────────────────────────────────────────────── */

const ARQUITETOS = [
  { value: 'Marcelo', label: 'Marcelo' },
  { value: 'Ana Lima', label: 'Ana Lima' },
]

const MARKETPLACE_STATUS = [
  { value: 'Em breve', label: 'Em breve' },
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
]

/* ── main ─────────────────────────────────────────────────── */

export function EditSolutionSheet({
  open,
  onClose,
  solution,
  onSave,
  onDelete,
  tiposLicenca,
  componentes,
  onComponenteCreated,
}: Props) {
  const [form, setForm] = useState(() => buildForm(solution))
  const [plans, setPlans] = useState<Plan[]>(solution?.plans ?? [])
  const [selectedComponenteIds, setSelectedComponenteIds] = useState<string[]>(solution?.componenteIds ?? [])
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null)
  const [componenteSelecaoOpen, setComponenteSelecaoOpen] = useState(false)
  const [componenteSheetOpen, setComponenteSheetOpen] = useState(false)

  const useInline = componentes.length <= THRESHOLD_INLINE

  // Re-sync form when solution changes
  const [lastSolution, setLastSolution] = useState(solution)
  if (solution !== lastSolution) {
    setLastSolution(solution)
    setForm(buildForm(solution))
    setPlans(solution?.plans ?? [])
    setSelectedComponenteIds(solution?.componenteIds ?? [])
  }

  function buildForm(s: Solution | null) {
    return {
      name:              s?.name              ?? '',
      description:       s?.description       ?? '',
      arquitetoPAS:      s?.arquitetoPAS      ?? '',
      marketplace:       s?.marketplace !== undefined && s?.marketplace !== null
                           ? s.marketplace !== 'Inativo'
                           : true,
      link01:            s?.link01            ?? '',
      titleLink01:       s?.titleLink01       ?? '',
      link02:            s?.link02            ?? '',
      titleLink02:       s?.titleLink02       ?? '',
      marketplaceStatus: s?.marketplaceStatus ?? 'Em breve',
    }
  }

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Tipos disponíveis = union dos tipos dos componentes selecionados, ou todos se nenhum selecionado
  const tiposDisponiveis: TipoLicenca[] = selectedComponenteIds.length === 0
    ? tiposLicenca
    : (() => {
        const ids = new Set(
          componentes
            .filter(c => selectedComponenteIds.includes(c.id))
            .flatMap(c => c.tiposLicenca)
        )
        return tiposLicenca.filter(t => ids.has(t.id))
      })()

  function handleOpenNewPlan() {
    setEditingPlanIndex(null)
    setPlanDialogOpen(true)
  }

  function handleEditPlan(index: number) {
    setEditingPlanIndex(index)
    setPlanDialogOpen(true)
  }

  function handleRemovePlan(index: number) {
    setPlans(prev => prev.filter((_, i) => i !== index))
  }

  function handlePlanSave(plan: Plan) {
    if (editingPlanIndex !== null) {
      setPlans(prev => prev.map((p, i) => i === editingPlanIndex ? plan : p))
    } else {
      setPlans(prev => [...prev, plan])
    }
    setPlanDialogOpen(false)
    setEditingPlanIndex(null)
  }

  function handlePlanDialogClose() {
    setPlanDialogOpen(false)
    setEditingPlanIndex(null)
  }

  async function handleCreateComponente(data: Omit<Componente, 'id' | 'createdAt'>) {
    const saved = await api.createComponente({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
    onComponenteCreated(saved)
    setSelectedComponenteIds(prev => [...prev, saved.id])
  }

  function handleSave() {
    if (!solution) return
    onSave({
      ...solution,
      name:              form.name,
      description:       form.description,
      arquitetoPAS:      form.arquitetoPAS,
      plans,
      componenteIds:     selectedComponenteIds,
      marketplace:       form.marketplace ? 'Ativo' : 'Inativo',
      link01:            form.link01,
      titleLink01:       form.titleLink01,
      link02:            form.link02,
      titleLink02:       form.titleLink02,
      marketplaceStatus: form.marketplaceStatus,
    })
    onClose()
  }

  if (!solution) return null

  const editingPlan = editingPlanIndex !== null ? plans[editingPlanIndex] : undefined

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Editar Solução"
        width="w-[768px]"
        footer={
          <>
            <Button variant="destructive" onClick={onDelete} className="mr-auto">
              Excluir solução
            </Button>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-10">

          {/* ── Ícone da solução ────────────────────────────── */}
          <div className="flex flex-col gap-6">
            <div className="flex gap-7 items-start">
              <div className="w-12 h-12 rounded-full border border-[#e5e7eb] bg-[#f3f4f6] shrink-0 overflow-hidden flex items-center justify-center text-sm font-bold text-[#6b7280]">
                {solution.name.charAt(0)}
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <p className="text-sm font-normal text-[#6b7280] leading-5">
                  Insira o ícone mobile da solução. Formato: 512×512 pixels.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 h-9 px-4 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] bg-white hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors w-fit"
                >
                  Escolher imagem
                </button>
              </div>
            </div>
            <Divider />
          </div>

          {/* ── Dados da solução ────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Dados da solução</SectionTitle>

            <Input
              label="Apelido da solução"
              required
              placeholder="Apelido da solução"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />

            <Input
              label="Descrição"
              placeholder="Descrição"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />

            {/* Info box */}
            <div className="flex items-start gap-2 bg-[#f3f4f6] rounded-md px-3 py-4">
              <CircleAlert className="w-4 h-4 text-[#6b7280] shrink-0 mt-0.5" />
              <p className="text-sm text-[#6b7280] leading-5">
                Inclua informações relevantes para destacar o propósito e os diferenciais da solução, facilitando a compreensão e a comparação com outras opções.
              </p>
            </div>

            <Divider />
          </div>

          {/* ── Componentes ─────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <SectionTitle>Selecione os componentes que compõem essa solução</SectionTitle>
            </div>
            <p className="text-sm text-[#6b7280] -mt-2">
              Os tipos de licença disponíveis para os planos serão derivados automaticamente dos componentes selecionados.
            </p>

            {useInline ? (
              <ComponenteSelector
                componentes={componentes}
                value={selectedComponenteIds}
                onChange={setSelectedComponenteIds}
                onCreateNew={() => setComponenteSheetOpen(true)}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setComponenteSelecaoOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-4 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors w-fit"
                >
                  <Plus className="w-4 h-4" />
                  Selecionar componentes
                  {selectedComponenteIds.length > 0 && (
                    <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {selectedComponenteIds.length}
                    </span>
                  )}
                </button>

                {selectedComponenteIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {componentes
                      .filter(c => selectedComponenteIds.includes(c.id))
                      .map(c => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 border border-[#2563eb] bg-blue-50 rounded-md text-xs font-medium text-[#2563eb]"
                        >
                          <Puzzle className="w-3 h-3" />
                          {c.nome}
                          <button
                            type="button"
                            onClick={() => setSelectedComponenteIds(prev => prev.filter(id => id !== c.id))}
                            className="ml-0.5 hover:text-blue-900 transition-colors"
                            aria-label={`Remover ${c.nome}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}

            <Divider />
          </div>

          {/* ── Planos ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3">
              <SectionTitle>Planos</SectionTitle>
              <button
                type="button"
                onClick={handleOpenNewPlan}
                className="inline-flex items-center h-8 px-3 border border-[#e5e7eb] rounded-md text-xs font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors"
              >
                Adicionar
              </button>
            </div>

            {plans.length === 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-[#030712]">Nenhum plano disponível</p>
                <p className="text-sm text-[#6b7280]">Adicione um plano para esta solução</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {plans.map((plan, i) => (
                  <PlanCard
                    key={i}
                    plan={plan}
                    onEdit={() => handleEditPlan(i)}
                    onRemove={() => handleRemovePlan(i)}
                  />
                ))}
              </div>
            )}

            <Divider />
          </div>

          {/* ── Configuração PAS ────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Configuração PAS</SectionTitle>

            <Select
              label="Arquiteto PAS responsável"
              required
              placeholder="Selecione"
              options={ARQUITETOS}
              value={form.arquitetoPAS}
              onChange={e => set('arquitetoPAS', e.target.value)}
            />

            <Divider />
          </div>

          {/* ── Marketplace ─────────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Marketplace</SectionTitle>

            {/* Toggle */}
            <button
              type="button"
              onClick={() => set('marketplace', !form.marketplace)}
              className="flex items-start gap-3 w-fit"
            >
              <div className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${form.marketplace ? 'bg-[#2563eb]' : 'bg-[#d1d5db]'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition-transform ${form.marketplace ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-[#030712] leading-none">Marketplace</p>
                <p className="text-sm font-normal text-[#6b7280] leading-5">Ativar marketplace</p>
              </div>
            </button>

            {/* Conditional marketplace fields */}
            {form.marketplace && (
              <div className="flex flex-col gap-7">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Link 01"
                    required
                    placeholder="https://"
                    value={form.link01}
                    onChange={e => set('link01', e.target.value)}
                  />
                  <Input
                    label="Título do Link 01"
                    required
                    placeholder="ex: Adquirir"
                    value={form.titleLink01}
                    onChange={e => set('titleLink01', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Link 02"
                    required
                    placeholder="https://"
                    value={form.link02}
                    onChange={e => set('link02', e.target.value)}
                  />
                  <Input
                    label="Título do Link 02"
                    required
                    placeholder="ex: Saiba mais"
                    value={form.titleLink02}
                    onChange={e => set('titleLink02', e.target.value)}
                  />
                </div>

                <div className="w-1/2">
                  <Select
                    label="Status"
                    options={MARKETPLACE_STATUS}
                    value={form.marketplaceStatus}
                    onChange={e => set('marketplaceStatus', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </Sheet>

      <NewPlanDialog
        open={planDialogOpen}
        onClose={handlePlanDialogClose}
        onSave={handlePlanSave}
        initialPlan={editingPlan}
        tiposLicenca={tiposDisponiveis}
      />

      <ComponenteSelecaoSheet
        open={componenteSelecaoOpen}
        onClose={() => setComponenteSelecaoOpen(false)}
        componentes={componentes}
        value={selectedComponenteIds}
        onChange={setSelectedComponenteIds}
      />

      <ComponenteSheet
        open={componenteSheetOpen}
        onClose={() => setComponenteSheetOpen(false)}
        onSave={handleCreateComponente}
        tiposLicenca={tiposLicenca}
      />
    </>
  )
}
