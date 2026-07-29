import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { useToast, ToastContainer } from './ui/Toast'
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
    valor: '',
    excedente: '',
    excedenteSemLimite: false,
    definirPreco: false,
    precoAnual: '',
    descontoMensal: '',
    precoMes: '',
  }
}

// Detecta se a linha de excedente deve nascer "expandida" ao editar
// (mantém consistente com o que foi salvo antes).
function hasExcedenteConfigurado(lic: Licensing): boolean {
  return lic.excedenteSemLimite === true || (lic.excedente ?? '').trim() !== ''
}

/* ── main ───────────────────────────────────────────────── */

export function NewPlanDialog({ open, onClose, onSave, initialPlan, tiposLicenca }: Props) {
  const { toasts, toast, dismiss } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [upgradeUrl, setUpgradeUrl] = useState('')
  const [licensings, setLicensings] = useState<Licensing[]>([])
  // Índices das linhas com a seção de excedente expandida na UI.
  const [excedenteOpen, setExcedenteOpen] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (open) {
      setName(initialPlan?.name ?? '')
      setDescription(initialPlan?.description ?? '')
      setUpgradeUrl(initialPlan?.upgradeUrl ?? '')
      const initialLics = initialPlan?.licensings ?? []
      setLicensings(initialLics)
      // Abre automaticamente as seções de excedente já preenchidas
      const openIndices = new Set<number>()
      initialLics.forEach((lic, i) => {
        if (hasExcedenteConfigurado(lic)) openIndices.add(i)
      })
      setExcedenteOpen(openIndices)
    }
  }, [open, initialPlan])

  function handleAddLicensing() {
    setLicensings(ls => [...ls, emptyLicensing()])
  }

  function handleRemoveLicensing(index: number) {
    setLicensings(ls => ls.filter((_, i) => i !== index))
    setExcedenteOpen(prev => {
      const next = new Set<number>()
      prev.forEach(i => {
        if (i < index) next.add(i)
        else if (i > index) next.add(i - 1)
      })
      return next
    })
  }

  function toggleExcedente(index: number) {
    setExcedenteOpen(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
        // Ao fechar, limpa os campos de excedente para não persistir estado oculto.
        setLicensings(ls => ls.map((l, i) =>
          i === index ? { ...l, excedente: '', excedenteSemLimite: false } : l
        ))
      } else {
        next.add(index)
      }
      return next
    })
  }

  function toggleExcedenteSemLimite(index: number) {
    setLicensings(ls => ls.map((l, i) => {
      if (i !== index) return l
      const willBeUnlimited = !l.excedenteSemLimite
      return {
        ...l,
        excedenteSemLimite: willBeUnlimited,
        // Ao marcar "sem limite", zera o número; ao desmarcar, deixa vazio pro usuário digitar.
        excedente: willBeUnlimited ? '' : (l.excedente ?? ''),
      }
    }))
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
    if (licensings.length === 0) {
      toast('Complete as informações de licenciamento antes de adicionar o plano.', 'warning')
      return
    }
    const hasEmptyTipo = licensings.some(l => l.tipoLicencaId === '')
    if (hasEmptyTipo) {
      toast('Selecione o tipo de licença.', 'warning')
      return
    }

    // Excedente: se ativo e não é "sem limite", precisa ter valor numérico >= valor nominal
    for (const lic of licensings) {
      const semLimite = lic.excedenteSemLimite === true
      const excedenteInformado = (lic.excedente ?? '').trim()
      // Se sem limite, nada a validar (o campo numérico é ignorado)
      if (semLimite) continue
      // Se o campo está vazio, tratamos como "excedente não configurado" — sem regra
      if (excedenteInformado === '') continue

      const nominal = Number((lic.valor ?? '').trim())
      const excedente = Number(excedenteInformado)
      if (Number.isNaN(excedente)) {
        toast(`Excedente inválido em "${lic.tipoLicencaNome || 'tipo de licença'}". Informe um número.`, 'warning')
        return
      }
      if (!Number.isNaN(nominal) && excedente < nominal) {
        toast(`Excedente deve ser maior ou igual ao valor nominal em "${lic.tipoLicencaNome || 'tipo de licença'}".`, 'warning')
        return
      }
    }

    if (!canSave) return
    onSave({ name: name.trim(), description: description.trim(), upgradeUrl: upgradeUrl.trim(), licensings })
    handleClose()
  }

  function handleClose() {
    setName('')
    setDescription('')
    setUpgradeUrl('')
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
      width="w-[640px]"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
            className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Adicionar
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
          placeholder="Descreva aqui o seu plano"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        {/* URL da página de upgrade */}
        <div className="flex flex-col gap-2">
          <Input
            label="URL da página de upgrade"
            placeholder="https://"
            value={upgradeUrl}
            onChange={e => setUpgradeUrl(e.target.value)}
          />
          <p className="text-sm text-[#6b7280]">
            Informe o endereço para onde o usuário será direcionado ao clicar em "Fazer upgrade".
          </p>
        </div>

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

                    {/* Tipo de Licença + Valor + remover */}
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
                      <div className="flex-1">
                        <Input
                          label="Valor"
                          placeholder="digite o valor"
                          value={lic.valor ?? ''}
                          onChange={e => handleLicensingChange(i, 'valor', e.target.value)}
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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </Sheet>
  )
}
