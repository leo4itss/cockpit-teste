import { useState } from 'react'
import { Plus, CircleAlert, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Dialog } from './ui/Dialog'
import { AddObjetoDialog } from './AddObjetoDialog'
import { EditLicencaDialog } from './EditLicencaDialog'
import { useToast, ToastContainer } from './ui/Toast'
import type { Account, Contract, Solution, ObjetoContrato, ContractHistoricoEntry, ProvisioningOverallStatus } from '@/types'

/** Mesmo mapeamento usado em ProvisionamentoPage / NewContractSheet — status da Fase 1 do tenant. */
const FASE1_BADGE: Record<ProvisioningOverallStatus, { variant: 'success' | 'info' | 'default' | 'error'; label: string }> = {
  COMPLETED: { variant: 'success', label: 'Concluído' },
  IN_PROGRESS: { variant: 'info', label: 'Em andamento' },
  PENDING: { variant: 'default', label: 'Pendente' },
  FAILED: { variant: 'error', label: 'Falhou' },
}

interface Props {
  open: boolean
  onClose: () => void
  contract: Contract
  solutions: Solution[]
  /** Necessário para o gate de Fase 1 quando o usuário adiciona soluções novas. */
  accounts: Account[]
  onSave: (contract: Contract) => void
  onDelete?: () => void
  onInativar?: () => void
  onActivate?: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

function ReadonlyField({ label, value, half }: { label: string; value?: string; half?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${half ? 'flex-1 min-w-0' : ''}`}>
      <label className="text-sm font-medium text-[#030712]">{label}</label>
      <div className="h-9 px-3 flex items-center bg-[#f3f4f6] rounded-md text-sm text-[#6b7280] truncate">
        {value ?? '—'}
      </div>
    </div>
  )
}

const RENOVACAO_OPTIONS = [
  { value: 'Automática', label: 'Automática' },
  { value: 'Manual', label: 'Manual' },
]

// ── Passo 1 — formulário de edição ────────────────────────────

function StepForm({
  contract, isInactive, objetos, setDialogOpen, handleRemoveObjeto,
  enrichObjeto, setEditLicencaObjeto, dataTermino, setDataTermino, renovacao, setRenovacao,
}: {
  contract: Contract
  isInactive: boolean
  objetos: ObjetoContrato[]
  setDialogOpen: (v: boolean) => void
  handleRemoveObjeto: (index: number) => void
  enrichObjeto: (obj: ObjetoContrato) => ObjetoContrato
  setEditLicencaObjeto: (v: { obj: ObjetoContrato; index: number }) => void
  dataTermino: string
  setDataTermino: (v: string) => void
  renovacao: string
  setRenovacao: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-10">

      {/* ── Dados do contrato ─────────────────────────────── */}
      <div className="flex flex-col gap-7">
        <SectionTitle>Dados do contrato</SectionTitle>

        <ReadonlyField
          label="Conta contratante (onde as soluções desse contrato vão aparecer)"
          value={contract.contratante}
        />

        {/* Card soluções / planos / licenciamentos */}
        <div className="border border-[#e5e7eb] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#030712]">
              Soluções, planos e licenciamentos<span className="text-[#dc2626]">*</span>
            </p>
            {!isInactive && (
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            )}
          </div>

          {objetos.length > 0 && (
            <>
              <Divider />
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_32px_32px] gap-2">
                {['Solução', 'Org. contratada', 'Plano', 'Licenciamento', '', ''].map((col, i) => (
                  <p key={i} className="text-xs text-[#6b7280] leading-4">{col}</p>
                ))}
              </div>
              <Divider />
              {objetos.map((obj, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_32px_32px] gap-2 items-center">
                  <p className="text-sm text-[#030712] truncate">{obj.solucao}</p>
                  <p className="text-sm text-[#030712] truncate">{obj.orgContratada}</p>
                  <p className="text-sm text-[#030712] truncate">{obj.plano}</p>
                  <p className="text-sm text-[#030712] truncate">{obj.licenciamento}</p>
                  {!isInactive ? (
                    <>
                      {/* Editar valores de licença */}
                      <button
                        type="button"
                        title="Ajustar valores de licença"
                        onClick={() => setEditLicencaObjeto({ obj: enrichObjeto(obj), index: i })}
                        className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#2563eb] transition-colors shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {/* Remover objeto */}
                      <button
                        type="button"
                        onClick={() => handleRemoveObjeto(i)}
                        className="w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#dc2626] transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 shrink-0" />
                      <div className="w-8 h-8 shrink-0" />
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

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

        <div className="flex gap-4 items-start">
          <ReadonlyField label="Data de início" value={contract.dataInicio} half />
          <div className="flex-1 min-w-0">
            <Input
              label="Data de término"
              required
              type="date"
              value={dataTermino}
              onChange={e => setDataTermino(e.target.value)}
              disabled={isInactive}
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
          value={renovacao}
          onChange={e => setRenovacao(e.target.value)}
          disabled={isInactive}
        />
      </div>

    </div>
  )
}

// ── Passo 2 — revisão apenas das soluções NOVAS ───────────────

function StepReview({
  contratante, selectedAccount, fase1Bloqueada, novosObjetos,
}: {
  contratante: string
  selectedAccount: Account | undefined
  fase1Bloqueada: boolean
  novosObjetos: ObjetoContrato[]
}) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <SectionTitle>Conta contratante</SectionTitle>
        <div className="flex items-center justify-between border border-[#e5e7eb] rounded-2xl p-4">
          <p className="text-sm font-medium text-[#030712]">{contratante}</p>
          {selectedAccount && (
            <Badge variant={FASE1_BADGE[selectedAccount.provisioningStatus].variant} showIcon>
              Fase 1: {FASE1_BADGE[selectedAccount.provisioningStatus].label}
            </Badge>
          )}
        </div>
      </div>

      {fase1Bloqueada && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-lg p-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
          <p className="text-xs font-medium text-red-700 leading-4">
            A Fase 1 do provisionamento desta conta (autenticação, banco de dados, DNS, ingress)
            ainda não foi concluída. As soluções novas não podem ser adicionadas — provisionar
            soluções exige a conta totalmente provisionada primeiro.
          </p>
        </div>
      )}

      <Divider />

      <div className="flex flex-col gap-3">
        <SectionTitle>Soluções novas que serão provisionadas (Fase 2)</SectionTitle>
        <div className="border border-[#e5e7eb] rounded-2xl p-4 flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-2">
            {['Solução', 'Organização contratada', 'Plano', 'Licenciamento'].map(col => (
              <p key={col} className="text-xs text-[#6b7280] leading-4">{col}</p>
            ))}
          </div>
          <Divider />
          {novosObjetos.map((obj, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center">
              <p className="text-sm text-[#030712] truncate">{obj.solucao}</p>
              <p className="text-sm text-[#030712] truncate">{obj.orgContratada}</p>
              <p className="text-sm text-[#030712] truncate">{obj.plano}</p>
              <p className="text-sm text-[#030712] truncate">{obj.licenciamento}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 bg-blue-50 border border-blue-300 rounded-lg p-3">
        <CircleAlert className="w-5 h-5 text-blue-700 shrink-0" />
        <p className="text-xs font-medium text-blue-700 leading-4">
          Ao confirmar, o contrato será atualizado e a Fase 2 do provisionamento será disparada
          para as {novosObjetos.length} solução(ões) nova(s).
        </p>
      </div>
    </div>
  )
}

// ── Sheet principal ────────────────────────────────────────────

export function EditContractSheet({ open, onClose, contract, solutions, accounts, onSave, onInativar, onActivate }: Props) {
  const { toasts, toast, dismiss } = useToast()
  const [dataTermino, setDataTermino] = useState(contract.dataTermino)
  const [renovacao, setRenovacao] = useState(contract.renovacao)
  const [objetos, setObjetos] = useState<ObjetoContrato[]>(contract.objetos ?? [])
  const [historico, setHistorico] = useState<ContractHistoricoEntry[]>(contract.historico ?? [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editLicencaObjeto, setEditLicencaObjeto] = useState<{ obj: ObjetoContrato; index: number } | null>(null)
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)
  // step 1 = formulário; step 2 = revisão/checkout — só aparece quando há solução nova
  const [step, setStep] = useState<1 | 2>(1)

  const isInactive = contract.status === 'Inativo'

  // Soluções que NÃO existiam no contrato original — só elas disparam Fase 2
  // e exigem revisão. Editar data/renovação sozinho não passa por aqui.
  const novosObjetos = objetos.filter(o =>
    !contract.objetos.some(orig => orig.solucao === o.solucao && orig.plano === o.plano)
  )
  const temSolucaoNova = novosObjetos.length > 0

  const selectedAccount = accounts.find(a => a.name === contract.contratante)
  const fase1Bloqueada = selectedAccount?.provisioningStatus !== 'COMPLETED'

  // Re-sync quando o contrato muda
  const [lastContract, setLastContract] = useState(contract)
  if (contract !== lastContract) {
    setLastContract(contract)
    setDataTermino(contract.dataTermino)
    setRenovacao(contract.renovacao)
    setObjetos(contract.objetos ?? [])
    setHistorico(contract.historico ?? [])
    setStep(1)
  }

  function hasUnsavedChanges() {
    return (
      dataTermino !== contract.dataTermino ||
      renovacao !== contract.renovacao ||
      JSON.stringify(objetos) !== JSON.stringify(contract.objetos ?? [])
    )
  }

  function handleClose() {
    if (!isInactive && hasUnsavedChanges()) {
      setUnsavedDialogOpen(true)
    } else {
      setStep(1)
      onClose()
    }
  }

  function handleObjetosSave(novos: ObjetoContrato[]) {
    setObjetos(prev => [...prev, ...novos])
    if (novos.length > 0) {
      toast('Solução adicionada ao contrato.', 'success')
    }
  }

  function handleRemoveObjeto(index: number) {
    const removed = objetos[index]
    setObjetos(prev => prev.filter((_, i) => i !== index))
    toast('Objeto removido do contrato.', 'success', {
      label: 'Desfazer',
      onClick: () => setObjetos(prev => {
        const copy = [...prev]
        copy.splice(index, 0, removed)
        return copy
      }),
    })
  }

  /** Enriquece o objeto com valoresLicenca do plano nas solutions, se ainda não tiver */
  function enrichObjeto(obj: ObjetoContrato): ObjetoContrato {
    if (obj.valoresLicenca && obj.valoresLicenca.length > 0) return obj
    const sol = solutions.find(s => s.name === obj.solucao)
    const plan = sol?.plans.find(p => p.name === obj.plano)
    if (!plan || plan.licensings.length === 0) return obj
    return {
      ...obj,
      valoresLicenca: plan.licensings.map(l => ({
        tipoLicencaNome: l.tipoLicencaNome || l.tipoLicencaId,
        tipoLicencaUnidade: l.tipoLicencaUnidade,
        valor: l.valorMinimo?.trim() || l.valor?.trim() || '',
      })),
    }
  }

  function handleLicencaSave(updated: ObjetoContrato, entrada: ContractHistoricoEntry) {
    setObjetos(prev => prev.map((obj, i) => i === editLicencaObjeto?.index ? updated : obj))
    setHistorico(prev => [entrada, ...prev])
    setEditLicencaObjeto(null)
    toast('Licença atualizada com sucesso.', 'success')
  }

  /** Salva de fato. Chamado direto (sem solução nova) ou após confirmar a revisão. */
  function handleSave() {
    if (temSolucaoNova && fase1Bloqueada) return // segundo gate
    onSave({ ...contract, objetos, historico, dataTermino, renovacao })
    setStep(1)
    onClose()
  }

  /** Botão primário do passo 1: só solução nova pede revisão. */
  function handlePrimaryAction() {
    if (temSolucaoNova) {
      setStep(2)
    } else {
      handleSave()
    }
  }

  const footerStep1 = (
    <>
      {isInactive ? (
        onActivate && (
          <Button variant="ghost" onClick={onActivate} className="mr-auto text-green-700 hover:bg-green-50">
            Ativar contrato
          </Button>
        )
      ) : (
        onInativar && (
          <Button variant="ghost" onClick={onInativar} className="mr-auto text-amber-600 hover:bg-amber-50">
            Inativar contrato
          </Button>
        )
      )}
      <Button variant="outline" onClick={handleClose}>Cancelar</Button>
      {!isInactive && (
        <Button onClick={handlePrimaryAction}>{temSolucaoNova ? 'Revisar' : 'Salvar'}</Button>
      )}
    </>
  )

  const footerStep2 = (
    <>
      <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
      <Button onClick={handleSave} disabled={fase1Bloqueada}>Salvar contrato</Button>
    </>
  )

  return (
    <>
      <Sheet
        open={open}
        onClose={handleClose}
        title={step === 1 ? 'Editar Contrato' : 'Revisar soluções novas'}
        width="w-[640px]"
        footer={step === 1 ? footerStep1 : footerStep2}
      >
        {step === 1 ? (
          <StepForm
            contract={contract}
            isInactive={isInactive}
            objetos={objetos}
            setDialogOpen={setDialogOpen}
            handleRemoveObjeto={handleRemoveObjeto}
            enrichObjeto={enrichObjeto}
            setEditLicencaObjeto={setEditLicencaObjeto}
            dataTermino={dataTermino}
            setDataTermino={setDataTermino}
            renovacao={renovacao}
            setRenovacao={setRenovacao}
          />
        ) : (
          <StepReview
            contratante={contract.contratante}
            selectedAccount={selectedAccount}
            fase1Bloqueada={fase1Bloqueada}
            novosObjetos={novosObjetos}
          />
        )}
      </Sheet>

      <AddObjetoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        solutions={solutions}
        orgName={contract.contratante}
        onSave={handleObjetosSave}
      />

      <EditLicencaDialog
        open={!!editLicencaObjeto}
        onClose={() => setEditLicencaObjeto(null)}
        objeto={editLicencaObjeto?.obj ?? null}
        onSave={handleLicencaSave}
      />

      {/* Dialog de alterações não salvas */}
      <Dialog
        open={unsavedDialogOpen}
        onClose={() => setUnsavedDialogOpen(false)}
        title="Editar contrato"
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setUnsavedDialogOpen(false)}>Continuar editando</Button>
            <Button onClick={() => { setUnsavedDialogOpen(false); setStep(1); onClose() }}>Sair sem salvar</Button>
          </>
        }
      >
        <p className="text-sm text-[#030712] leading-5">
          Existem alterações não salvas. Deseja sair mesmo assim?
        </p>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
