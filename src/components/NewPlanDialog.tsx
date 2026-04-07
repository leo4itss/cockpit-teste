import { useState } from 'react'
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
}

const TIPO_LICENSA_OPTIONS = [
  { value: 'named', label: 'Named' },
  { value: 'concurrent', label: 'Concurrent' },
  { value: 'device', label: 'Device' },
]

const MODELOS_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
  { value: 'perpetuo', label: 'Perpétuo' },
]

const MAXIMO_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
  { value: 'ilimitado', label: 'Ilimitado' },
]

const emptyLicensing = (): Licensing => ({ tipoLicensa: '', modelos: '', maximo: '' })

export function NewPlanDialog({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [licensings, setLicensings] = useState<Licensing[]>([])

  function handleAddLicensing() {
    setLicensings(ls => [...ls, emptyLicensing()])
  }

  function handleRemoveLicensing(index: number) {
    setLicensings(ls => ls.filter((_, i) => i !== index))
  }

  function handleLicensingChange(index: number, field: keyof Licensing, value: string) {
    setLicensings(ls => ls.map((l, i) => i === index ? { ...l, [field]: value } : l))
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
      title="Novo plano"
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
              <div className="flex flex-col gap-4">
                {licensings.map((licensing, i) => (
                  <div key={i} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Select
                        label="Tipo de Licensa"
                        placeholder="Selecione"
                        options={TIPO_LICENSA_OPTIONS}
                        value={licensing.tipoLicensa}
                        onChange={e => handleLicensingChange(i, 'tipoLicensa', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Select
                        label="Modelos"
                        placeholder="Selecione"
                        options={MODELOS_OPTIONS}
                        value={licensing.modelos}
                        onChange={e => handleLicensingChange(i, 'modelos', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Select
                        label="Máximo"
                        placeholder="Selecione"
                        options={MAXIMO_OPTIONS}
                        value={licensing.maximo}
                        onChange={e => handleLicensingChange(i, 'maximo', e.target.value)}
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
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  )
}
