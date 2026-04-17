import { useState } from 'react'
import { Plus, AlertCircle, Trash2 } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { AddObjetoDialog } from './AddObjetoDialog'
import type { Contract, Solution, ObjetoContrato } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  contract: Contract
  solutions: Solution[]
  onSave: (contract: Contract) => void
  onDelete?: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

const RENOVACAO_OPTIONS = [
  { value: 'Automática', label: 'Automática' },
  { value: 'Manual', label: 'Manual' },
  { value: 'Mensal', label: 'Mensal' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' },
]

function buildForm(c: Contract) {
  return {
    dataInicio: c.dataInicio,
    dataTermino: c.dataTermino,
    renovacao: c.renovacao,
  }
}

export function EditContractSheet({ open, onClose, contract, solutions, onSave, onDelete }: Props) {
  const [form, setForm] = useState(() => buildForm(contract))
  const [objetos, setObjetos] = useState<ObjetoContrato[]>(contract.objetos ?? [])
  const [dialogOpen, setDialogOpen] = useState(false)

  // Re-sync quando o contrato muda
  const [lastContract, setLastContract] = useState(contract)
  if (contract !== lastContract) {
    setLastContract(contract)
    setForm(buildForm(contract))
    setObjetos(contract.objetos ?? [])
  }

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleObjetosSave(novos: ObjetoContrato[]) {
    setObjetos(prev => [...prev, ...novos])
  }

  function handleRemoveObjeto(index: number) {
    setObjetos(prev => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    onSave({
      ...contract,
      objetos,
      dataInicio: form.dataInicio,
      dataTermino: form.dataTermino,
      renovacao: form.renovacao,
    })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Editar Contrato"
        width="w-[768px]"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
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
              options={[{ value: contract.contratante, label: contract.contratante }]}
              value={contract.contratante}
              onChange={() => {}}
            />

            {/* Card de objetos do contrato */}
            <div className="border border-[#e5e7eb] rounded-md p-4 flex flex-col gap-[10px]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#030712]">
                  Soluções, planos e licenciamentos<span className="text-red-600">*</span>
                </p>
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </Button>
              </div>

              <Divider />

              {/* Cabeçalho das colunas */}
              <div className="flex gap-[10px] items-center">
                {['Solução', 'Org. contratada', 'Plano', 'Licenciamento', 'Qtd'].map(col => (
                  <div key={col} className="flex-1 min-w-0">
                    <span className="text-xs text-[#6b7280]">{col}</span>
                  </div>
                ))}
                <div className="w-8 shrink-0" />
              </div>

              {objetos.length === 0 ? (
                <p className="text-sm text-[#6b7280] py-2">Nenhum objeto adicionado.</p>
              ) : (
                <>
                  <Divider />
                  {objetos.map((obj, i) => (
                    <div key={i} className="flex gap-[10px] items-center">
                      <div className="flex-1 min-w-0">
                        <div className="h-9 flex items-center px-3 rounded-md bg-white border border-[#e5e7eb]">
                          <span className="text-sm text-[#030712] truncate">{obj.solucao}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-9 flex items-center px-3 rounded-md bg-white border border-[#e5e7eb]">
                          <span className="text-sm text-[#030712] truncate">{obj.orgContratada}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-9 flex items-center px-3 rounded-md bg-white border border-[#e5e7eb]">
                          <span className="text-sm text-[#030712] truncate">{obj.plano}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-9 flex items-center px-3 rounded-md bg-white border border-[#e5e7eb]">
                          <span className="text-sm text-[#030712] truncate">{obj.licenciamento}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Input
                          type="number"
                          value={String(obj.qtdContratada)}
                          onChange={e => setObjetos(prev =>
                            prev.map((o, idx) => idx === i ? { ...o, qtdContratada: Number(e.target.value) } : o)
                          )}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveObjeto(i)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 bg-[#f3f4f6] p-2 rounded-md">
              <AlertCircle className="w-4 h-4 text-[#030712] shrink-0" />
              <p className="text-xs text-[#030712] leading-4">
                Objetos do contrato reúnem soluções, planos e licenciamentos, definindo as condições e limites para atender às necessidades do cliente.
              </p>
            </div>

            <Divider />
          </div>

          {/* ── Vigência ─────────────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Vigência</SectionTitle>

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
              placeholder="Selecione"
              value={form.renovacao}
              onChange={e => set('renovacao', e.target.value)}
            />
          </div>

        </div>
      </Sheet>

      <AddObjetoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        solutions={solutions}
        orgName={contract.contratante}
        onSave={handleObjetosSave}
      />
    </>
  )
}
