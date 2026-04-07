import { useState } from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import type { Contract } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  contract: Contract
  onSave: (contract: Contract) => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

const PLANO_OPTIONS = [
  { value: 'Pro', label: 'Pro' },
  { value: 'Basic', label: 'Basic' },
  { value: 'Enterprise', label: 'Enterprise' },
]

const LICENCIAMENTO_OPTIONS = [
  { value: 'Por usuário | Nominal | Até 10 usuários', label: 'Por usuário | Nominal | Até 10 usuários' },
  { value: 'Por usuário | Nominal | Até 50 usuários', label: 'Por usuário | Nominal | Até 50 usuários' },
  { value: 'Ilimitado', label: 'Ilimitado' },
]

const RENOVACAO_OPTIONS = [
  { value: 'Automática', label: 'Automática' },
  { value: 'Manual', label: 'Manual' },
]

export function EditContractSheet({ open, onClose, contract, onSave }: Props) {
  const [form, setForm] = useState({
    contratante: contract.contratante,
    orgContratada: contract.orgContratada,
    solucoes: contract.solucoes,
    plano: contract.plano,
    licenciamento: contract.licenciamento ?? '',
    qtdContratada: String(contract.qtdContratada),
    dataInicio: contract.dataInicio,
    dataTermino: contract.dataTermino,
    renovacao: contract.renovacao,
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSave() {
    onSave({
      ...contract,
      contratante: form.contratante,
      orgContratada: form.orgContratada,
      solucoes: form.solucoes,
      plano: form.plano,
      licenciamento: form.licenciamento,
      qtdContratada: Number(form.qtdContratada),
      dataInicio: form.dataInicio,
      dataTermino: form.dataTermino,
      renovacao: form.renovacao,
    })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Editar Contrato"
      width="w-[768px]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-10">

        {/* ── Dados do contrato ─────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <SectionTitle>Dados do contrato</SectionTitle>

          <Select
            label="Conta contratante (onde as soluções desse contrato vão aparecer)"
            options={[{ value: form.contratante, label: form.contratante }]}
            value={form.contratante}
            onChange={e => set('contratante', e.target.value)}
          />

          {/* Card de soluções / planos / licenciamentos */}
          <div className="border border-[#e5e7eb] rounded-md p-4 flex flex-col gap-[10px]">

            {/* Header do card */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#030712]">
                Soluções, planos e licenciamentos<span className="text-red-600">*</span>
              </p>
              <Button variant="outline" size="sm">
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            </div>

            <Divider />

            {/* Cabeçalho das colunas */}
            <div className="flex gap-[15px] items-end">
              {['Solução', 'Organização contratada', 'Plano', 'Licenciamento', 'Qtd contratada'].map(col => (
                <div key={col} className="flex-1 min-w-0">
                  <div className="h-9 flex items-center px-3 rounded-md bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                    <span className="text-xs text-[#6b7280] truncate">{col}</span>
                  </div>
                </div>
              ))}
            </div>

            <Divider />

            {/* Linha de dados */}
            <div className="flex gap-[15px] items-center">
              {/* Solução — read only */}
              <div className="flex-1 min-w-0">
                <div className="h-9 flex items-center px-3 rounded-md bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                  <span className="text-sm text-[#030712] truncate">{form.solucoes || '—'}</span>
                </div>
              </div>
              {/* Organização contratada — read only */}
              <div className="flex-1 min-w-0">
                <div className="h-9 flex items-center px-3 rounded-md bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                  <span className="text-sm text-[#030712] truncate">{form.orgContratada || '—'}</span>
                </div>
              </div>
              {/* Plano — select */}
              <div className="flex-1 min-w-0">
                <Select
                  options={PLANO_OPTIONS}
                  value={form.plano}
                  onChange={e => set('plano', e.target.value)}
                />
              </div>
              {/* Licenciamento — select */}
              <div className="flex-1 min-w-0">
                <Select
                  options={LICENCIAMENTO_OPTIONS}
                  placeholder="Selecione"
                  value={form.licenciamento}
                  onChange={e => set('licenciamento', e.target.value)}
                />
              </div>
              {/* Qtd contratada — input */}
              <div className="flex-1 min-w-0">
                <Input
                  type="number"
                  value={form.qtdContratada}
                  onChange={e => set('qtdContratada', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Banner informativo */}
          <div className="flex items-center gap-2 bg-[#f3f4f6] p-2">
            <AlertCircle className="w-4 h-4 text-[#030712] shrink-0" />
            <p className="text-xs text-[#030712] leading-4">
              Objetos do contrato reúnem soluções, planos e licenciamentos, definindo as condições e limites para atender às necessidades do cliente.
            </p>
          </div>

          <Divider />
        </div>

        {/* ── Vigência ─────────────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <div className="flex items-center justify-between">
            <SectionTitle>Vigência</SectionTitle>
            <Button variant="outline" size="sm">Adicionar</Button>
          </div>

          <div className="flex gap-7 items-start">
            <div className="w-[234px]">
              <Input
                label="Data de início"
                required
                type="date"
                value={form.dataInicio}
                onChange={e => set('dataInicio', e.target.value)}
              />
            </div>
            <div className="w-[234px]">
              <Input
                label="Data de término"
                required
                type="date"
                value={form.dataTermino}
                onChange={e => set('dataTermino', e.target.value)}
              />
            </div>
          </div>

          <Divider />
        </div>

        {/* ── Renovação ─────────────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <SectionTitle>Renovação</SectionTitle>

          <Select
            label="Tipo de renovação"
            options={RENOVACAO_OPTIONS}
            value={form.renovacao}
            onChange={e => set('renovacao', e.target.value)}
          />
        </div>

      </div>
    </Sheet>
  )
}
