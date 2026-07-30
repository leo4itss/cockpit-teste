import { useState } from 'react'
import { Plus, CircleAlert } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Select } from './ui/Select'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { AddObjetoDialog } from './AddObjetoDialog'
import { useToast, ToastContainer } from './ui/Toast'
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

const COLS = ['Solução', 'Plano', 'Licenciamento']

export function NewContractSheet({ open, onClose, orgId, orgName, accounts, solutions, onSave }: Props) {
  const { toasts, toast, dismiss } = useToast()
  const activeAccounts = accounts.filter(a => !a.deletedAt)
  const activeSolutions = solutions.filter(s => s.status !== 'Inativo')

  const [contratante, setContratante] = useState(() => activeAccounts[0]?.name ?? '')
  const [form, setForm] = useState({ dataInicio: '', dataTermino: '', renovacao: '' })
  const [objetos, setObjetos] = useState<ObjetoContrato[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)

  // Sincroniza contratante quando accounts carrega depois do mount
  const [lastAccounts, setLastAccounts] = useState(accounts)
  if (accounts !== lastAccounts) {
    setLastAccounts(accounts)
    if (!contratante && activeAccounts.length > 0) {
      setContratante(activeAccounts[0].name)
    }
  }

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleObjetosSave(novos: ObjetoContrato[]) {
    setObjetos(prev => [...prev, ...novos])
    if (novos.length > 0) {
      toast('Objeto adicionado ao contrato.', 'success')
    }
  }

  function handleOpenAddObjeto() {
    if (activeSolutions.length === 0) {
      toast('Nenhuma solução disponível para contratação.\nCrie ou ative uma solução antes de criar o contrato.', 'warning')
      return
    }
    setDialogOpen(true)
  }

  function handleSave() {
    // Validação de campos obrigatórios
    const missing: string[] = []
    if (!form.dataInicio) missing.push('Informe a data de início.')
    if (!form.dataTermino) missing.push('Informe a data de término.')
    if (!form.renovacao) missing.push('Selecione o tipo de renovação.')

    if (missing.length > 0) {
      toast(`Não foi possível criar o contrato.\n${missing.join('\n')}`, 'warning')
      return
    }

    // Validação de vigência
    if (form.dataInicio && form.dataTermino && form.dataTermino <= form.dataInicio) {
      toast('A data de término deve ser posterior à data de início.', 'warning')
      return
    }

    // Validação de objetos
    if (objetos.length === 0) {
      toast('Adicione ao menos um objeto ao contrato para continuar.', 'warning')
      return
    }

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
        width="w-[640px]"
        footer={
          <>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>
              Criar Contrato
            </Button>
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
              placeholder="Selecione"
              value={contratante}
              onChange={e => setContratante(e.target.value)}
            />

            {/* Card soluções / planos / licenciamentos */}
            <div className="border border-[#e5e7eb] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#030712]">
                  Soluções, planos e licenciamentos<span className="text-[#dc2626]">*</span>
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddObjeto}
                  className="inline-flex items-center gap-1.5 h-8 px-3 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>

              {objetos.length > 0 && (
                <>
                  <Divider />
                  {/* Cabeçalho */}
                  <div className="grid grid-cols-3 gap-2">
                    {COLS.map(col => (
                      <p key={col} className="text-xs text-[#6b7280] leading-4">{col}</p>
                    ))}
                  </div>
                  <Divider />
                  {/* Linhas */}
                  {objetos.map((obj, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-center">
                      <p className="text-sm text-[#030712] truncate">{obj.solucao}</p>
                      <p className="text-sm text-[#030712] truncate">{obj.plano}</p>
                      <p className="text-sm text-[#030712] truncate">{obj.licenciamento}</p>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Info box */}
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-300 rounded-lg p-3">
              <CircleAlert className="w-5 h-5 text-blue-700 shrink-0" />
              <p className="text-xs font-medium text-blue-700 leading-4">
                Objetos do contrato reúnem soluções, planos e licenciamentos, definindo as condições e limites para atender às necessidades do cliente.
              </p>
            </div>

            <Divider />
          </div>

          {/* ── Vigência ─────────────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Vigência</SectionTitle>
            <div className="grid grid-cols-2 gap-7">
              <Input
                label="Data de início"
                required
                type="date"
                value={form.dataInicio}
                onChange={e => set('dataInicio', e.target.value)}
              />
              <Input
                label="Data de término"
                required
                type="date"
                value={form.dataTermino}
                onChange={e => set('dataTermino', e.target.value)}
              />
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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
