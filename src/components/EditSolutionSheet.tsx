import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, MoreVertical, CircleAlert, Pencil, Trash2, TriangleAlert, History } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { NewPlanDialog } from './NewPlanDialog'
import { Dialog } from './ui/Dialog'
import type { Solution, Plan, TipoLicenca, Componente, Contract } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  solution: Solution | null
  onSave: (solution: Solution) => void
  onDelete?: () => void
  onInactivate?: () => void
  onActivate?: () => void
  tiposLicenca: TipoLicenca[]
  componentes: Componente[]
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
  disabled = false,
}: {
  plan: Plan
  onEdit: () => void
  onRemove: () => void
  disabled?: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const licensings = plan.licensings.map(l => {
    const nome = l.tipoLicencaNome || l.tipoLicencaId
    const unidade = l.tipoLicencaUnidade ?? ''
    const min = l.valorMinimo?.trim()
    const max = l.valorMaximo?.trim()
    const val = l.valor?.trim()
    let range = ''
    if (min && max) range = `${min}–${max} ${unidade}`.trim()
    else if (min) range = `${min} ${unidade}`.trim()
    else if (max) range = `Até ${max} ${unidade}`.trim()
    else if (val) range = `${val} ${unidade}`.trim()
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
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-[#030712] leading-5">{plan.name}</p>
            {plan.versao && (
              <span className="text-xs font-normal text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] px-1.5 py-0.5 rounded">
                v{plan.versao}
              </span>
            )}
          </div>
          {plan.description && (
            <p className="text-xs text-[#6b7280] leading-4 mt-0.5">{plan.description}</p>
          )}
        </div>

        {/* Dropdown menu — oculto quando inativa */}
        {!disabled && (
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
        )}
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
  onInactivate,
  onActivate,
  tiposLicenca,
  componentes,
  contracts,
}: Props) {
  // Planos ativos = o que o usuário vê e edita; inativas ficam no histórico
  function activePlans(s: Solution | null): Plan[] {
    return (s?.plans ?? []).filter(p => !p.statusVersao || p.statusVersao === 'ativo')
  }

  const [form, setForm] = useState(() => buildForm(solution))
  const [plans, setPlans] = useState<Plan[]>(() => activePlans(solution))
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null)
  const [confirmVersionModal, setConfirmVersionModal] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Componentes são sempre read-only — não podem ser alterados após a solução ser criada
  const componentesVinculados = componentes.filter(c =>
    (solution?.componenteIds ?? []).includes(c.id)
  )

  // Re-sync form when solution changes
  const [lastSolution, setLastSolution] = useState(solution)
  if (solution !== lastSolution) {
    setLastSolution(solution)
    setForm(buildForm(solution))
    setPlans(activePlans(solution))
    setHistoryOpen(false)
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

  // Tipos disponíveis = union dos tipos dos componentes vinculados à solução
  const tiposDisponiveis: TipoLicenca[] = componentesVinculados.length === 0
    ? tiposLicenca
    : (() => {
        const ids = new Set(componentesVinculados.flatMap(c => c.tiposLicenca))
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

  function doSave() {
    if (!solution) return
    onSave({
      ...solution,
      name:              form.name,
      description:       form.description,
      arquitetoPAS:      form.arquitetoPAS,
      plans,
      componenteIds:     solution.componenteIds, // componentes nunca mudam na edição
      marketplace:       form.marketplace ? 'Ativo' : 'Inativo',
      link01:            form.link01,
      titleLink01:       form.titleLink01,
      link02:            form.link02,
      titleLink02:       form.titleLink02,
      marketplaceStatus: form.marketplaceStatus,
    })
    setConfirmVersionModal(false)
    onClose()
  }

  function handleSave() {
    if (!solution) return

    // Detecta se algum plano EXISTENTE teve conteúdo alterado (não planos novos)
    const stripMeta = ({ versao: _v, statusVersao: _s, criadoEm: _c, ...rest }: Plan) => rest
    const existingActive = activePlans(solution)
    const hasModifiedExistingPlan = plans.some(p => {
      const existing = existingActive.find(ep => ep.name === p.name)
      if (!existing) return false // plano novo — sem versão anterior
      return JSON.stringify(stripMeta(existing)) !== JSON.stringify(stripMeta(p))
    })

    if (hasModifiedExistingPlan) {
      // Exibe modal de confirmação de nova versão
      setConfirmVersionModal(true)
      return
    }
    doSave()
  }

  if (!solution) return null

  const editingPlan = editingPlanIndex !== null ? plans[editingPlanIndex] : undefined

  // Solução inativa: somente leitura
  const isInactive = solution.status === 'Inativo'

  // Planos inativados = histórico de versões anteriores
  const inactivePlans = (solution.plans ?? []).filter(p => p.statusVersao === 'inativo')

  // Sem contratos vinculados → pode excluir direto
  const hasLinkedContracts = (contracts ?? []).some(ct => {
    try {
      const objs: Array<{ solucao: string }> = Array.isArray(ct.objetos)
        ? ct.objetos
        : (typeof ct.objetos === 'string' ? JSON.parse(ct.objetos) : [])
      return objs.some(obj => obj.solucao === solution.name)
    } catch { return false }
  })

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Editar Solução"
        width="w-[640px]"
        footer={
          <>
            {isInactive ? (
              /* Solução inativa: só permite ativar */
              <Button
                variant="ghost"
                onClick={onActivate}
                className="mr-auto text-green-700 hover:bg-green-50"
              >
                Ativar solução
              </Button>
            ) : hasLinkedContracts ? (
              /* Tem contratos vinculados: só inativa */
              <Button
                variant="ghost"
                onClick={onInactivate}
                className="mr-auto text-amber-600 hover:bg-amber-50"
              >
                Inativar solução
              </Button>
            ) : (
              /* Sem contratos: pode excluir permanentemente */
              <Button
                variant="ghost"
                onClick={onDelete}
                className="mr-auto text-[#dc2626] hover:bg-red-50"
              >
                Excluir solução
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            {!isInactive && <Button onClick={handleSave}>Salvar</Button>}
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
              label="Nome da instância da solução"
              required
              placeholder="Nome da instância da solução"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              disabled={isInactive}
            />

            <Input
              label="Descrição"
              placeholder="Descrição"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              disabled={isInactive}
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

          {/* ── Componentes (somente leitura) ───────────────── */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Componentes</SectionTitle>
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-md px-3 py-3 -mt-2">
              <CircleAlert className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-[#030712] leading-5">
                Os componentes de uma solução não podem ser alterados após a criação. Para uma composição diferente, crie uma nova solução.
              </p>
            </div>

            {componentesVinculados.length === 0 ? (
              <p className="text-sm text-[#9ca3af]">Nenhum componente vinculado.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {componentesVinculados.map(c => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-0.5 px-4 py-3 border border-[#e5e7eb] rounded-lg bg-[#f9fafb]"
                  >
                    <p className="text-sm font-medium text-[#030712]">{c.nome}</p>
                    {c.descricao && (
                      <p className="text-sm text-[#6b7280]">{c.descricao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Divider />
          </div>

          {/* ── Planos ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3">
              <SectionTitle>Planos</SectionTitle>
              {!isInactive && (
                <button
                  type="button"
                  onClick={handleOpenNewPlan}
                  className="inline-flex items-center h-8 px-3 border border-[#e5e7eb] rounded-md text-xs font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors"
                >
                  Adicionar
                </button>
              )}
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
                    disabled={isInactive}
                    onEdit={() => handleEditPlan(i)}
                    onRemove={() => handleRemovePlan(i)}
                  />
                ))}
              </div>
            )}

            {/* ── Histórico de versões (colapsável) ─────────── */}
            {inactivePlans.length > 0 && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(v => !v)}
                  className="flex items-center gap-2 text-sm text-[#6b7280] hover:text-[#030712] transition-colors w-fit"
                >
                  <History className="w-3.5 h-3.5" />
                  Histórico de versões
                  <span className="bg-[#f3f4f6] text-[#6b7280] text-xs px-1.5 py-0.5 rounded-full border border-[#e5e7eb]">
                    {inactivePlans.length}
                  </span>
                  {historyOpen
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  }
                </button>

                {historyOpen && (
                  <div className="flex flex-col gap-2 pl-2 border-l-2 border-[#e5e7eb]">
                    {[...inactivePlans].reverse().map((plan, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 px-3 py-2.5 border border-[#e5e7eb] rounded-lg bg-[#fafafa] opacity-70"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-[#6b7280]">{plan.name}</p>
                            {plan.versao && (
                              <span className="text-xs text-[#9ca3af] bg-white border border-[#e5e7eb] px-1.5 py-0.5 rounded">
                                v{plan.versao}
                              </span>
                            )}
                            <span className="text-xs text-[#9ca3af] bg-white border border-[#e5e7eb] px-1.5 py-0.5 rounded">
                              Inativo
                            </span>
                          </div>
                          {plan.criadoEm && (
                            <p className="text-xs text-[#9ca3af] mt-0.5">
                              {new Date(plan.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              disabled={isInactive}
            />

            <Divider />
          </div>

          {/* ── Marketplace ─────────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Marketplace</SectionTitle>

            {/* Toggle */}
            <button
              type="button"
              onClick={isInactive ? undefined : () => set('marketplace', !form.marketplace)}
              disabled={isInactive}
              className="flex items-start gap-3 w-fit disabled:opacity-60 disabled:cursor-not-allowed"
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
                    disabled={isInactive}
                  />
                  <Input
                    label="Título do Link 01"
                    required
                    placeholder="ex: Adquirir"
                    value={form.titleLink01}
                    onChange={e => set('titleLink01', e.target.value)}
                    disabled={isInactive}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Link 02"
                    required
                    placeholder="https://"
                    value={form.link02}
                    onChange={e => set('link02', e.target.value)}
                    disabled={isInactive}
                  />
                  <Input
                    label="Título do Link 02"
                    required
                    placeholder="ex: Saiba mais"
                    value={form.titleLink02}
                    onChange={e => set('titleLink02', e.target.value)}
                    disabled={isInactive}
                  />
                </div>

                <div className="w-1/2">
                  <Select
                    label="Status"
                    options={MARKETPLACE_STATUS}
                    value={form.marketplaceStatus}
                    onChange={e => set('marketplaceStatus', e.target.value)}
                    disabled={isInactive}
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

      {/* ── Modal de confirmação de nova versão do plano ───── */}
      <Dialog
        open={confirmVersionModal}
        onClose={() => setConfirmVersionModal(false)}
        title="Criar nova versão do plano"
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmVersionModal(false)}>Cancelar</Button>
            <Button onClick={doSave}>Confirmar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#030712] leading-5">
            Uma nova versão deste plano será criada com os valores atualizados. A versão anterior será mantida como histórico. Contratos existentes não serão afetados.
          </p>
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-md px-4 py-3">
            <TriangleAlert className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-5">
              Novos contratos criados após a confirmação usarão a versão atualizada do plano.
            </p>
          </div>
        </div>
      </Dialog>

    </>
  )
}
