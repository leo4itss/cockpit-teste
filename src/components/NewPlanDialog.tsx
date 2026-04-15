import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import type { Plan, Licensing, TipoLicenca } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (plan: Plan) => void
  initialPlan?: Plan
  tiposLicenca: TipoLicenca[]  // tipos disponíveis (filtrados pelos componentes da solução)
}

/* ── helpers ────────────────────────────────────────────── */

function emptyLicensing(): Licensing {
  return {
    tipoLicencaId: '',
    tipoLicencaNome: '',
    tipoLicencaUnidade: '',
    valorMinimo: '',
    valorMaximo: '',
    definirPreco: false,
    precoAnual: '',
    descontoMensal: '',
    precoMes: '',
  }
}

/* ── main ───────────────────────────────────────────────── */

export function NewPlanDialog({ open, onClose, onSave, initialPlan, tiposLicenca }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [licensings, setLicensings] = useState<Licensing[]>([])

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

      if (field === 'tipoLicencaId') {
        const tipo = tiposLicenca.find(t => t.id === value)
        updated.tipoLicencaNome = tipo?.nome ?? ''
        updated.tipoLicencaUnidade = tipo?.unidade ?? ''
      }

      return updated
    }))
  }

  function handleSave() {
    if (!canSave) return
    onSave({ name: name.trim(), description: description.trim(), licensings })
    handleClose()
  }

  function handleClose() {
    setName('')
    setDescription('')
    setLicensings([])
    onClose()
  }

  // Tipos ainda não usados neste plano (evita duplicatas)
  function availableOptions(currentId: string) {
    const usedIds = licensings.map(l => l.tipoLicencaId).filter(id => id !== currentId)
    return tiposLicenca
      .filter(t => !usedIds.includes(t.id))
      .map(t => ({ value: t.id, label: `${t.nome} (${t.unidade})` }))
  }

  const canSave = name.trim() !== '' && licensings.length > 0 &&
    licensings.every(l => l.tipoLicencaId !== '')

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={initialPlan ? 'Editar plano' : 'Novo plano'}
      width="w-[560px]"
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
          placeholder="Escreva aqui"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        {/* Licenciamento */}
        <div className="border border-gray-200 rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#030712]">
                Licenciamento<span className="text-red-500 ml-0.5">*</span>
              </p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Ao menos um tipo de licença é obrigatório por plano.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLicensing}
              disabled={tiposLicenca.length === 0 || licensings.length >= tiposLicenca.length}
              className="inline-flex items-center gap-1.5 h-9 px-4 border border-gray-200 rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {tiposLicenca.length === 0 && (
            <p className="text-sm text-[#6b7280] bg-gray-50 rounded-md px-4 py-3">
              Selecione componentes na solução para habilitar os tipos de licença disponíveis.
            </p>
          )}

          {licensings.length > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <div className="flex flex-col gap-6">
                {licensings.map((lic, i) => (
                  <div key={i} className="flex flex-col gap-4">

                    {/* Tipo de Licença + remover */}
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Select
                          label="Tipo de Licença"
                          required
                          placeholder="Selecione o tipo"
                          options={availableOptions(lic.tipoLicencaId)}
                          value={lic.tipoLicencaId}
                          onChange={e => handleLicensingChange(i, 'tipoLicencaId', e.target.value)}
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

                    {/* Valor mínimo e máximo */}
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label={`Valor mínimo${lic.tipoLicencaUnidade ? ` (${lic.tipoLicencaUnidade})` : ''}`}
                        placeholder="Opcional"
                        value={lic.valorMinimo ?? ''}
                        onChange={e => handleLicensingChange(i, 'valorMinimo', e.target.value)}
                      />
                      <Input
                        label={`Valor máximo${lic.tipoLicencaUnidade ? ` (${lic.tipoLicencaUnidade})` : ''}`}
                        placeholder="Opcional"
                        value={lic.valorMaximo ?? ''}
                        onChange={e => handleLicensingChange(i, 'valorMaximo', e.target.value)}
                      />
                    </div>

                    {i < licensings.length - 1 && (
                      <div className="border-t border-gray-100" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Sheet>
  )
}
