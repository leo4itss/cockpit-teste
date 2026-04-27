import { useState } from 'react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Upload, CircleAlert, Plus, Puzzle } from 'lucide-react'
import { PlanCard } from './PlanCard'
import { NewPlanDialog } from './NewPlanDialog'
import { ComponenteSelector } from './ComponenteSelector'
import { ComponenteSelecaoSheet } from './ComponenteSelecaoSheet'
import type { Solution, Plan, TipoLicenca, Componente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  orgId: string
  onSave: (solution: Omit<Solution, 'id'>) => void
  tiposLicenca: TipoLicenca[]
  componentes: Componente[]
}

/* ── sub-components ────────────────────────────────────── */

const THRESHOLD_INLINE = 5  // ≤ este valor: inline; > este valor: sheet

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] pb-3 leading-snug">{children}</p>
}

function Divider() {
  return <div className="border-t border-gray-100 w-full" />
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-gray-100 rounded-md px-3 py-2">
      <CircleAlert className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
      <p className="text-xs text-[#030712] leading-snug">{children}</p>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`} />
    </button>
  )
}

/* ── options ───────────────────────────────────────────── */

const ARQUITETOS = [
  { value: 'marcelo', label: 'Marcelo Gomes' },
  { value: 'ana', label: 'Ana Lima' },
]

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Em breve', label: 'Em breve' },
  { value: 'Disponível', label: 'Disponível' },
]

/* ── main ──────────────────────────────────────────────── */

export function NewSolutionSheet({
  open,
  onClose,
  orgId,
  onSave,
  tiposLicenca,
  componentes,
  onComponenteCreated,
}: Props) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    arquitetoPAS: '',
    marketplace: false,
    link01: '',
    titleLink01: '',
    link02: '',
    titleLink02: '',
    marketplaceStatus: '',
  })
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedComponenteIds, setSelectedComponenteIds] = useState<string[]>([])
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [componenteSelecaoOpen, setComponenteSelecaoOpen] = useState(false)
  const [componenteSheetOpen, setComponenteSheetOpen] = useState(false)

  const useInline = componentes.length <= THRESHOLD_INLINE

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Tipos disponíveis para planos = union dos componentes selecionados (ou todos se nenhum)
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

  const selectedComponentes = componentes.filter(c => selectedComponenteIds.includes(c.id))

  const baseValid = form.name.trim() !== '' && form.arquitetoPAS !== ''
  const marketplaceValid = !form.marketplace || (
    form.link01.trim() !== '' && form.titleLink01.trim() !== '' &&
    form.link02.trim() !== '' && form.titleLink02.trim() !== ''
  )
  const canSave = baseValid && marketplaceValid

  function handleSave() {
    if (!canSave) return
    onSave({
      orgId,
      name: form.name,
      description: form.description,
      arquitetoPAS: form.arquitetoPAS,
      plans,
      componenteIds: selectedComponenteIds,
      status: 'Ativo',
      createdAt: new Date().toISOString(),
      marketplace:       form.marketplace ? 'Ativo' : '',
      link01:            form.link01,
      titleLink01:       form.titleLink01,
      link02:            form.link02,
      titleLink02:       form.titleLink02,
      marketplaceStatus: form.marketplaceStatus,
    })
    setForm({ name: '', description: '', arquitetoPAS: '', marketplace: false, link01: '', titleLink01: '', link02: '', titleLink02: '', marketplaceStatus: '' })
    setPlans([])
    setSelectedComponenteIds([])
    onClose()
  }

  async function handleCreateComponente(data: Omit<Componente, 'id' | 'createdAt'>) {
    const saved = await api.createComponente({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() })
    onComponenteCreated(saved)
    setSelectedComponenteIds(prev => [...prev, saved.id])
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nova Solução"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave} className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-10">

        {/* ── Ícone ──────────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <div className="flex items-start gap-7">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-gray-400 text-lg">?</span>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <p className="text-sm text-gray-500 leading-snug">Insira o ícone mobile da solução. Formato: 512×512 pixels.</p>
              <button className="inline-flex items-center gap-2 h-9 px-4 border border-gray-200 rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors w-fit">
                <Upload className="w-4 h-4 text-gray-400" />
                Escolher imagem
              </button>
            </div>
          </div>
          <Divider />
        </div>

        {/* ── Dados da solução ───────────────────────── */}
        <div className="flex flex-col gap-7">
          <SectionTitle>Dados da solução</SectionTitle>

          <Input
            label="Apelido da solução"
            required
            placeholder="Como chama a solução?"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />

          <Input
            label="Descrição"
            placeholder="Descreva brevemente a solução"
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />

          <InfoBox>
            Inclua informações relevantes para destacar o propósito e os diferenciais da solução, facilitando a compreensão e a comparação com outras opções.
          </InfoBox>

          <Divider />
        </div>

        {/* ── Componentes ────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <SectionTitle>Selecione os componentes que compõem essa solução</SectionTitle>
          </div>
          <p className="text-sm text-[#6b7280] -mt-2">
            Os tipos de licença disponíveis para os planos serão derivados automaticamente dos componentes selecionados.
          </p>

          {useInline ? (
            /* ≤ 5 componentes: seletor inline */
            <ComponenteSelector
              componentes={componentes}
              value={selectedComponenteIds}
              onChange={setSelectedComponenteIds}
              onCreateNew={() => setComponenteSheetOpen(true)}
            />
          ) : (
            /* > 5 componentes: botão que abre sheet de seleção */
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

              {/* Chips dos componentes selecionados */}
              {selectedComponentes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedComponentes.map(c => (
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

        {/* ── Planos ─────────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <div className="flex items-center justify-between">
            <SectionTitle>Planos</SectionTitle>
            <button
              onClick={() => setPlanDialogOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-md text-xs font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[#030712]">Nenhum plano disponível</p>
              <p className="text-sm text-gray-500">Adicione um plano para esta solução</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {plans.map((plan, i) => (
                <PlanCard
                  key={i}
                  plan={plan}
                  onRemove={() => setPlans(ps => ps.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          )}

          <Divider />
        </div>

        {/* ── Configuração PAS ───────────────────────── */}
        <div className="flex flex-col gap-7">
          <SectionTitle>Configuração PAS</SectionTitle>
          <Select
            label="Arquiteto PAS responsável"
            required
            placeholder="Escolha o arquiteto"
            options={ARQUITETOS}
            value={form.arquitetoPAS}
            onChange={e => set('arquitetoPAS', e.target.value)}
          />
          <Divider />
        </div>

        {/* ── Marketplace ────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <SectionTitle>Marketplace</SectionTitle>
          <div className="flex items-start gap-3">
            <Toggle checked={form.marketplace} onChange={v => set('marketplace', v)} />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[#030712] leading-none">Marketplace</p>
              <p className="text-sm text-gray-500">Ativar marketplace</p>
            </div>
          </div>

          {form.marketplace && (
            <div className="flex flex-col gap-7">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Link 01" required placeholder="Cole aqui o link" value={form.link01} onChange={e => set('link01', e.target.value)} />
                <Input label="Título do Link 01" required placeholder="Digite o título" value={form.titleLink01} onChange={e => set('titleLink01', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Link 02" required placeholder="Cole aqui o link" value={form.link02} onChange={e => set('link02', e.target.value)} />
                <Input label="Título do Link 02" required placeholder="Digite o título" value={form.titleLink02} onChange={e => set('titleLink02', e.target.value)} />
              </div>
              <div className="w-1/2">
                <Select label="Status" placeholder="Selecione o status" options={STATUS_OPTIONS} value={form.marketplaceStatus} onChange={e => set('marketplaceStatus', e.target.value)} />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Sub-sheets e dialogs */}
      <NewPlanDialog
        open={planDialogOpen}
        onClose={() => setPlanDialogOpen(false)}
        onSave={plan => { setPlans(p => [...p, plan]); setPlanDialogOpen(false) }}
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
    </Sheet>
  )
}
