import { useState } from 'react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Upload, CircleAlert, Plus, Trash2 } from 'lucide-react'
import { NewPlanDialog } from './NewPlanDialog'
import type { Solution, Plan } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  orgId: string
  onSave: (solution: Omit<Solution, 'id'>) => void
}

/* ── sub-components ────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base font-bold text-[#030712] pb-3 leading-snug">{children}</p>
  )
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

/* ── toggle ────────────────────────────────────────────── */

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
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

/* ── main ──────────────────────────────────────────────── */

const ARQUITETOS = [
  { value: 'marcelo', label: 'Marcelo Gomes' },
  { value: 'ana', label: 'Ana Lima' },
]

const TIPOS = [
  { value: 'Assistente de IA',     label: 'Assistente de IA' },
  { value: 'Base de conhecimento', label: 'Base de conhecimento' },
  { value: 'Enterprise',           label: 'Enterprise' },
  { value: 'Padrão',               label: 'Padrão' },
]

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Em breve', label: 'Em breve' },
  { value: 'Disponível', label: 'Disponível' },
]

export function NewSolutionSheet({ open, onClose, orgId, onSave }: Props) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: '',
    arquitetoPAS: '',
    marketplace: false,
    link01: '',
    titleLink01: '',
    link02: '',
    titleLink02: '',
    marketplaceStatus: '',
  })
  const [plans, setPlans] = useState<Plan[]>([])
  const [planDialogOpen, setPlanDialogOpen] = useState(false)

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  // Required fields validation
  const baseValid = form.name.trim() !== '' && form.arquitetoPAS !== ''
  const marketplaceValid = !form.marketplace || (
    form.link01.trim() !== '' &&
    form.titleLink01.trim() !== '' &&
    form.link02.trim() !== '' &&
    form.titleLink02.trim() !== ''
  )
  const canSave = baseValid && marketplaceValid

  function handleSave() {
    if (!canSave) return
    onSave({
      orgId,
      name: form.name,
      description: form.description,
      type: form.type,
      arquitetoPAS: form.arquitetoPAS,
      plans,
      status: 'Ativo',
      createdAt: new Date().toISOString(),
    })
    // reset
    setForm({ name: '', description: '', type: '', arquitetoPAS: '', marketplace: false, link01: '', titleLink01: '', link02: '', titleLink02: '', marketplaceStatus: '' })
    setPlans([])
    onClose()
  }

  function addPlan(plan: Plan) {
    setPlans(p => [...p, plan])
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nova Solução"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-10">

        {/* ── Ícone da solução ──────────────────────────── */}
        <div className="flex flex-col gap-7">
          <div className="flex items-start gap-7">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <span className="text-gray-400 text-lg">?</span>
            </div>
            <div className="flex flex-col gap-2 min-w-0">
              <p className="text-sm text-gray-500 leading-snug">
                Insira o ícone mobile da solução. Formato: 512×512 pixels.
              </p>
              <button className="inline-flex items-center gap-2 h-9 px-4 border border-gray-200 rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors w-fit">
                <Upload className="w-4 h-4 text-gray-400" />
                Escolher imagem
              </button>
            </div>
          </div>
          <Divider />
        </div>

        {/* ── Dados da solução ──────────────────────────── */}
        <div className="flex flex-col gap-7">
          <SectionTitle>Dados da solução</SectionTitle>

          <Select
            label="Tipo da solução"
            placeholder="Selecione"
            options={TIPOS}
            value={form.type}
            onChange={e => set('type', e.target.value)}
          />

          <Input
            label="Apelido da solução"
            required
            placeholder="Como chama a solução?"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />

          <Input
            label="Descrição"
            placeholder="Como chama a solução?"
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />

          <InfoBox>
            Escolha um nome único para o domínio.{' '}
            Este identificador não pode ser divulgado no sistema.
          </InfoBox>

          <Divider />
        </div>

        {/* ── Planos ────────────────────────────────────── */}
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
                <div key={i} className="flex items-center justify-between h-9 px-3 border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                  <span className="text-sm text-[#030712]">{plan.name}</span>
                  <button
                    onClick={() => setPlans(ps => ps.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Divider />
        </div>

        {/* ── Configuração PAS ──────────────────────────── */}
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

        {/* ── Marketplace ───────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <SectionTitle>Marketplace</SectionTitle>

          {/* Toggle */}
          <div className="flex items-start gap-3">
            <Toggle
              checked={form.marketplace}
              onChange={v => set('marketplace', v)}
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[#030712] leading-none">Marketplace</p>
              <p className="text-sm text-gray-500">Ativar marketplace</p>
            </div>
          </div>

          {/* Marketplace fields — only shown when toggled ON */}
          {form.marketplace && (
            <div className="flex flex-col gap-7">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Link 01"
                  required
                  placeholder="Cole aqui o link"
                  value={form.link01}
                  onChange={e => set('link01', e.target.value)}
                />
                <Input
                  label="Título do Link 01"
                  required
                  placeholder="Digite o título do link"
                  value={form.titleLink01}
                  onChange={e => set('titleLink01', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Link 02"
                  required
                  placeholder="Cole aqui o link"
                  value={form.link02}
                  onChange={e => set('link02', e.target.value)}
                />
                <Input
                  label="Título do Link 02"
                  required
                  placeholder="Digite o título do link"
                  value={form.titleLink02}
                  onChange={e => set('titleLink02', e.target.value)}
                />
              </div>

              <div className="w-1/2">
                <Select
                  label="Status"
                  placeholder="Selecione o status"
                  options={STATUS_OPTIONS}
                  value={form.marketplaceStatus}
                  onChange={e => set('marketplaceStatus', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

      </div>

      <NewPlanDialog
        open={planDialogOpen}
        onClose={() => setPlanDialogOpen(false)}
        onSave={plan => { addPlan(plan); setPlanDialogOpen(false) }}
        solutionType={form.type}
      />
    </Sheet>
  )
}
