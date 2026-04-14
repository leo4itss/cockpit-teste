import { useState, useEffect, useRef } from 'react'
import { Plus, Minus, Check, ChevronDown } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import type { Plan, Licensing } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (plan: Plan) => void
  initialPlan?: Plan
  solutionType?: string
}

/* ── option tables ──────────────────────────────────────── */

const SLOT_OPTIONS = [
  { value: '1 slot',   label: '1 slot' },
  { value: '5 slots',  label: '5 slots' },
  { value: '10 slots', label: '10 slots' },
  { value: 'outro',    label: 'outro' },
]

const GIGABYTES_OPTIONS = [
  { value: '10 GB',  label: '10 GB' },
  { value: '50 GB',  label: '50 GB' },
  { value: '100 GB', label: '100 GB' },
  { value: 'outro',  label: 'outro' },
]

const MODELO_OPTIONS = [
  { value: 'Nominal',     label: 'Nominal' },
  { value: 'Concorrente', label: 'Concorrente' },
]

const USUARIOS_OPTIONS = [
  { value: '5 usuários',  label: '5 usuários' },
  { value: '10 usuários', label: '10 usuários' },
  { value: '15 usuários', label: '15 usuários' },
  { value: 'outro',       label: 'outro' },
]

/* ── helpers ────────────────────────────────────────────── */

function isGigaBytesSolution(solutionType?: string) {
  const t = solutionType?.toLowerCase() ?? ''
  return t.includes('conhecimento') || t.includes('base')
}

function firstDimKey(solutionType?: string) {
  return isGigaBytesSolution(solutionType) ? 'gigabytes' : 'slot'
}

function emptyLicensing(solutionType?: string): Licensing {
  return {
    tipoLicenca: [firstDimKey(solutionType), 'modelo', 'usuarios'],
    slots: '',
    modelo: '',
    usuarios: '',
    definirPreco: false,
    precoAnual: '',
    descontoMensal: '',
    precoMes: '',
  }
}

function calcPrecoMes(precoAnual: string, descontoMensal: string): string {
  const anual = parseFloat(precoAnual.replace(',', '.'))
  const desconto = parseFloat(descontoMensal.replace(',', '.'))
  if (isNaN(anual) || isNaN(desconto)) return ''
  return ((anual * (1 - desconto / 100)) / 12).toFixed(2).replace('.', ',')
}

/* ── Toggle ─────────────────────────────────────────────── */

function LicensingToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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

/* ── Tipo de Licença multi-select ───────────────────────── */

interface TipoLicencaOption {
  key: string
  label: string
  required: boolean
}

function TipoLicencaDropdown({
  solutionType,
  value,
  onChange,
}: {
  solutionType?: string
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const dimKey = firstDimKey(solutionType)
  const isGB   = isGigaBytesSolution(solutionType)

  const options: TipoLicencaOption[] = [
    { key: dimKey,      label: isGB ? 'GigaBytes (Obrigatório)' : 'Slot (Obrigatório)', required: true },
    { key: 'modelo',    label: 'Modelo',   required: false },
    { key: 'usuarios',  label: 'Usuários', required: false },
  ]

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function toggle(key: string, required: boolean) {
    if (required) return
    if (value.includes(key)) {
      onChange(value.filter(k => k !== key))
    } else {
      onChange([...value, key])
    }
  }

  return (
    <div className="relative flex-1" ref={ref}>
      <label className="block text-sm font-medium text-[#030712] mb-1.5">
        Tipo de Licença
      </label>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-9 flex items-center justify-between gap-2 px-3 border border-gray-200 rounded-md bg-white text-sm text-[#030712] hover:bg-gray-50 transition-colors shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
      >
        <span className="truncate text-[#6b7280]">selecione o tipo</span>
        <ChevronDown className="w-4 h-4 text-[#6b7280] shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
          {options.map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key, opt.required)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                opt.required
                  ? 'text-[#030712] cursor-default'
                  : 'text-[#030712] hover:bg-gray-50'
              }`}
            >
              <span>{opt.label}</span>
              {value.includes(opt.key) && (
                <Check className="w-4 h-4 text-[#030712] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── main ───────────────────────────────────────────────── */

export function NewPlanDialog({ open, onClose, onSave, initialPlan, solutionType }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [licensings, setLicensings] = useState<Licensing[]>([])

  // Sync state when dialog opens (support edit mode)
  useEffect(() => {
    if (open) {
      setName(initialPlan?.name ?? '')
      setDescription(initialPlan?.description ?? '')
      setLicensings(initialPlan?.licensings ?? [])
    }
  }, [open, initialPlan])

  const isGB = isGigaBytesSolution(solutionType)
  const dimKey = firstDimKey(solutionType)
  const firstColLabel   = isGB ? 'GigaBytes' : 'Slots'
  const firstColOptions = isGB ? GIGABYTES_OPTIONS : SLOT_OPTIONS

  function handleAddLicensing() {
    setLicensings(ls => [...ls, emptyLicensing(solutionType)])
  }

  function handleRemoveLicensing(index: number) {
    setLicensings(ls => ls.filter((_, i) => i !== index))
  }

  function handleLicensingChange(index: number, field: keyof Licensing, value: string | boolean | string[]) {
    setLicensings(ls => ls.map((l, i) => {
      if (i !== index) return l
      const updated = { ...l, [field]: value }
      if (field === 'precoAnual' || field === 'descontoMensal') {
        const anual   = field === 'precoAnual'      ? value as string : l.precoAnual
        const desconto = field === 'descontoMensal' ? value as string : l.descontoMensal
        updated.precoMes = calcPrecoMes(anual, desconto)
      }
      return updated
    }))
  }

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim(), licensings })
    handleClose()
  }

  function handleClose() {
    setName('')
    setDescription('')
    setLicensings([])
    onClose()
  }

  const canSave = name.trim() !== ''

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={initialPlan ? 'Editar plano' : 'Novo plano'}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
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
      <div className="flex flex-col gap-7">
        <Input
          label="Nome do plano"
          required
          placeholder="Nome do plano"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <Input
          label="Descrição"
          required
          placeholder="Escreva aqui"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        {/* Licenciamento box */}
        <div className="border border-gray-200 rounded-2xl p-6 flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#030712]">
              Licenciamento<span className="text-red-500 ml-0.5">*</span>
            </p>
            <button
              type="button"
              onClick={handleAddLicensing}
              className="inline-flex items-center gap-1.5 h-9 px-4 border border-gray-200 rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {licensings.length > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <div className="flex flex-col gap-6">
                {licensings.map((lic, i) => {
                  const hasDim = (key: string) => lic.tipoLicenca.includes(key)
                  return (
                    <div key={i} className="flex flex-col gap-4">

                      {/* Tipo de Licença multi-select + minus button */}
                      <div className="flex items-end gap-3">
                        <TipoLicencaDropdown
                          solutionType={solutionType}
                          value={lic.tipoLicenca}
                          onChange={v => handleLicensingChange(i, 'tipoLicenca', v)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLicensing(i)}
                          className="shrink-0 w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors mb-0.5"
                          aria-label="Remover licenciamento"
                        >
                          <Minus className="w-4 h-4 text-[#030712]" />
                        </button>
                      </div>

                      {/* Sub-selects: only visible dimensions */}
                      {(hasDim(dimKey) || hasDim('modelo') || hasDim('usuarios')) && (
                        <div className="grid grid-cols-3 gap-3">
                          {hasDim(dimKey) ? (
                            <Select
                              label={firstColLabel}
                              placeholder="Selecione"
                              options={firstColOptions}
                              value={lic.slots}
                              onChange={e => handleLicensingChange(i, 'slots', e.target.value)}
                            />
                          ) : (
                            <div />
                          )}

                          {hasDim('modelo') ? (
                            <Select
                              label="Modelo"
                              placeholder="Selecione"
                              options={MODELO_OPTIONS}
                              value={lic.modelo}
                              onChange={e => handleLicensingChange(i, 'modelo', e.target.value)}
                            />
                          ) : (
                            <div />
                          )}

                          {hasDim('usuarios') ? (
                            <Select
                              label="Usuários"
                              placeholder="Selecione"
                              options={USUARIOS_OPTIONS}
                              value={lic.usuarios}
                              onChange={e => handleLicensingChange(i, 'usuarios', e.target.value)}
                            />
                          ) : (
                            <div />
                          )}
                        </div>
                      )}

                      {/* Definir preço toggle */}
                      <div className="flex items-center gap-3">
                        <LicensingToggle
                          checked={lic.definirPreco}
                          onChange={v => handleLicensingChange(i, 'definirPreco', v)}
                        />
                        <span className="text-sm text-[#030712]">Definir preço</span>
                      </div>

                      {/* Pricing fields (toggle ON) */}
                      {lic.definirPreco && (
                        <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-3 gap-3">
                            <Input
                              label="Preço / ano (R$)"
                              required
                              placeholder="Digite o valor"
                              value={lic.precoAnual}
                              onChange={e => handleLicensingChange(i, 'precoAnual', e.target.value)}
                            />
                            <Input
                              label="Desconto p/ mensal (%)"
                              required
                              placeholder="Digite o valor"
                              value={lic.descontoMensal}
                              onChange={e => handleLicensingChange(i, 'descontoMensal', e.target.value)}
                            />
                            <div className="flex flex-col gap-1.5">
                              <label className="text-sm font-medium text-[#030712]">Preço / mês (R$)</label>
                              <input
                                readOnly
                                value={lic.precoMes || '00,00'}
                                className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-[#6b7280] outline-none"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-[#6b7280] leading-snug">
                            Preço mensal = (Preço anual × (1 – desconto%)) ÷ 12
                          </p>
                        </div>
                      )}

                      {i < licensings.length - 1 && (
                        <div className="border-t border-gray-100" />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
