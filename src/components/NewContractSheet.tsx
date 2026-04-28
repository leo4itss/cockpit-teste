import { useState } from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Select } from './ui/Select'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { AddObjetoDialog } from './AddObjetoDialog'
import type { Account, Contract, Solution, ObjetoContrato } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  orgId: string
  orgName: string
  accounts: Account[]
  solutions: Solution[]
  onSave: (contract: Omit<Contract, 'id'>) => void
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
  { value: 'Anual', label: 'Anual' },
]

export function NewContractSheet({ open, onClose, orgId, orgName, accounts, solutions, onSave }: Props) {
  // Contas ativas (sem deletedAt) disponíveis para ser a contratante
  const activeAccounts = accounts.filter(a => !a.deletedAt)

  const [contratante, setContratante] = useState('')
  const [form, setForm] = useState({
    dataInicio: '',
    dataTermino: '',
    renovacao: '',
  })
  const [objetos, setObjetos] = useState<ObjetoContrato[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleObjetosSave(novos: ObjetoContrato[]) {
    setObjetos(prev => [...prev, ...novos])
  }

  function handleSave() {
    onSave({
      orgId,
      contratante: contratante || activeAccounts[0]?.name || orgName,
      objetos,
      dataInicio: form.dataInicio,
      dataTermino: form.dataTermino,
      renovacao: form.renovacao,
      status: 'Ativo',
    })
    setContratante('')
    setObjetos([])
    setForm({ dataInicio: '', dataTermino: '', renovacao: '' })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Novo Contrato"
        width="w-[80vw] max-w-[960px]"
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
              options={activeAccounts.map(a => ({ value: a.name, label: a.name }))}
              placeholder="Selecione uma conta"
              value={contratante}
              onChange={e => setContratante(e.target.value)}
            />

            {/* Card de soluções / planos / licenciamentos */}
            <div className="border border-[#e5e7eb] rounded-md p-4 flex flex-col gap-[10px]">

              {/* Header do card */}
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
              <div className="flex gap-[15px] items-center">
                {['Solução', 'Organização contratada', 'Plano', 'Licenciamento', 'Qtd contratada'].map(col => (
                  <div key={col} className="flex-1 min-w-0">
                    <div className="h-9 flex items-center px-3 rounded-md bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                      <span className="text-xs text-[#6b7280] truncate">{col}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Linhas de objetos selecionados */}
              {objetos.length > 0 ? (
                <>
                  <Divider />
                  {objetos.map((obj, i) => (
                    <div key={i} className="flex gap-[15px] items-center">
                      <div className="flex-1 min-w-0">
                        <div className="h-9 flex items-center px-3 rounded-md bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                          <span className="text-sm text-[#030712] truncate">{obj.solucao}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-9 flex items-center px-3 rounded-md bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                          <span className="text-sm text-[#030712] truncate">{obj.orgContratada}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-9 flex items-center px-3 rounded-md bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                          <span className="text-sm text-[#030712] truncate">{obj.plano}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="h-9 flex items-center px-3 rounded-md bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
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
                    </div>
                  ))}
                </>
              ) : null}
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
        orgName={orgName}
        onSave={handleObjetosSave}
      />
    </>
  )
}
