import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
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
}

const TIPO_LICENCA_OPTIONS = [
  { value: 'named', label: 'Named' },
  { value: 'concurrent', label: 'Concurrent' },
  { value: 'device', label: 'Device' },
]

const SLOTS_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: 'ilimitado', label: 'Ilimitado' },
]

const MODELO_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
  { value: 'perpetuo', label: 'Perpétuo' },
]

const USUARIOS_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: 'ilimitado', label: 'Ilimitado' },
]

const emptyLicensing = (): Licensing => ({
  tipoLicenca: '',
  slots: '',
  modelo: '',
  usuarios: '',
  definirPreco: false,
  precoAnual: '',
  descontoMensal: '',
  precoMes: '',
})

function calcPrecoMes(precoAnual: string, descontoMensal: string): string {
  const anual = parseFloat(precoAnual.replace(',', '.'))
  const desconto = parseFloat(descontoMensal.replace(',', '.'))
  if (isNaN(anual) || isNaN(desconto)) return ''
  return ((anual * (1 - desconto / 100)) / 12).toFixed(2).replace('.', ',')
}

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
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function NewPlanDialog({ open, onClose, onSave, initialPlan }: Props) {
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

  function handleAddLicensing() {
    setLicensings(ls => [...ls, emptyLicensing()])
  }

  function handleRemoveLicensing(index: number) {
    setLicensings(ls => ls.filter((_, i) => i !== index))
  }

  function handleLicensingChange(index: number, field: keyof Licensing, value: string | boolean) {
    setLicensings(ls => ls.map((l, i) => {
      if (i !== index) return l
      const updated = { ...l, [field]: value }
      if (field === 'precoAnual' || field === 'descontoMensal') {
        const anual = field === 'precoAnual' ? value as string : l.precoAnual
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
          <Button onClick={handleSave} disabled={!canSave} className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}>
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

        {/* Licenciamento */}
        <div className="border border-gray-200 rounded-2xl p-6 flex flex-col gap-6">
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
                {licensings.map((licensing, i) => (
                  <div key={i} className="flex flex-col gap-4">
                    {/* Tipo de Licença + Minus */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Select
                          label="Tipo de Licença"
                          placeholder="selecione o tipo"
                          options={TIPO_LICENCA_OPTIONS}
                          value={licensing.tipoLicenca}
                          onChange={e => handleLicensingChange(i, 'tipoLicenca', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLicensing(i)}
                        className="shrink-0 w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors mb-0.5"
                        aria-label="Remover licenciamento"
                      >
                        <Minus className="w-4 h-4 text-[#030712]" />
                      </button>
                    </div>

                    {/* Slots + Modelo + Usuários */}
                    <div className="grid grid-cols-3 gap-3">
                      <Select
                        label="Slots"
                        placeholder="Selecione"
                        options={SLOTS_OPTIONS}
                        value={licensing.slots}
                        onChange={e => handleLicensingChange(i, 'slots', e.target.value)}
                      />
                      <Select
                        label="Modelo"
                        placeholder="Selecione"
                        options={MODELO_OPTIONS}
                        value={licensing.modelo}
                        onChange={e => handleLicensingChange(i, 'modelo', e.target.value)}
                      />
                      <Select
                        label="Usuários"
                        placeholder="Selecione"
                        options={USUARIOS_OPTIONS}
                        value={licensing.usuarios}
                        onChange={e => handleLicensingChange(i, 'usuarios', e.target.value)}
                      />
                    </div>

                    {/* Definir preço toggle */}
                    <div className="flex items-center gap-3">
                      <LicensingToggle
                        checked={licensing.definirPreco}
                        onChange={v => handleLicensingChange(i, 'definirPreco', v)}
                      />
                      <span className="text-sm text-[#030712]">Definir preço</span>
                    </div>

                    {/* Pricing fields (when toggle ON) */}
                    {licensing.definirPreco && (
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-3 gap-3">
                          <Input
                            label="Preço / ano (R$)"
                            required
                            placeholder="Digite o valor"
                            value={licensing.precoAnual}
                            onChange={e => handleLicensingChange(i, 'precoAnual', e.target.value)}
                          />
                          <Input
                            label="Desconto p/ mensal (%)"
                            required
                            placeholder="Digite o valor"
                            value={licensing.descontoMensal}
                            onChange={e => handleLicensingChange(i, 'descontoMensal', e.target.value)}
                          />
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-[#030712]">Preço / mês (R$)</label>
                            <input
                              readOnly
                              value={licensing.precoMes || '00,00'}
                              className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-[#6b7280] outline-none"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-[#6b7280] leading-snug">
                          O preço mensal é calculado automaticamente aplicando o desconto sobre o preço anual dividido por 12.
                        </p>
                      </div>
                    )}

                    {i < licensings.length - 1 && <div className="border-t border-gray-100" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
