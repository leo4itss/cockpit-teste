import { useState } from 'react'
import { Plus, CircleAlert, AlertTriangle, ExternalLink } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Select } from './ui/Select'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { AddObjetoDialog } from './AddObjetoDialog'
import { useToast, ToastContainer } from './ui/Toast'
import type { Account, Contract, Solution, ObjetoContrato, ProvisioningOverallStatus } from '@/types'

/** Mesmo mapeamento usado em ProvisionamentoPage — status da Fase 1 do tenant. */
const FASE1_BADGE: Record<ProvisioningOverallStatus, { variant: 'success' | 'info' | 'default' | 'error'; label: string }> = {
  COMPLETED: { variant: 'success', label: 'Concluído' },
  IN_PROGRESS: { variant: 'info', label: 'Em andamento' },
  PENDING: { variant: 'default', label: 'Pendente' },
  FAILED: { variant: 'error', label: 'Falhou' },
}

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

/**
 * Aviso de bloqueio da Fase 1. Aparece no passo 1 assim que uma conta com
 * provisionamento incompleto é selecionada, e permanece no passo 2 como
 * defesa (a conta pode mudar de status em background — ver comentário no
 * footer do passo 2).
 */
function Fase1BlockedWarning({ account }: { account: Account }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-lg p-3">
      <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-red-700 leading-4">
          A Fase 1 do provisionamento desta conta (banco, Keycloak, DNS, ingress) ainda não
          foi concluída. O contrato não pode ser criado — provisionar soluções exige a conta
          totalmente provisionada primeiro.
        </p>
        <a
          href={`/contas/${account.id}/provisionamento`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline w-fit"
        >
          Ver detalhes do provisionamento <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

const RENOVACAO_OPTIONS = [
  { value: 'Automática', label: 'Automática' },
  { value: 'Manual', label: 'Manual' },
  { value: 'Anual', label: 'Anual' },
]

const COLS = ['Solução', 'Organização contratada', 'Plano', 'Licenciamento']

// ── Passo 1 — formulário ─────────────────────────────────────

function StepForm({
  activeAccounts, contratante, setContratante, selectedAccount, fase1Bloqueada,
  objetos, handleOpenAddObjeto, form, set,
}: {
  activeAccounts: Account[]
  contratante: string
  setContratante: (v: string) => void
  selectedAccount: Account | undefined
  fase1Bloqueada: boolean
  objetos: ObjetoContrato[]
  handleOpenAddObjeto: () => void
  form: { dataInicio: string; dataTermino: string; renovacao: string }
  set: (field: string, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-10">

      {/* ── Dados do contrato ─────────────────────────────── */}
      <div className="flex flex-col gap-7">
        <SectionTitle>Dados do contrato</SectionTitle>

        <div className="flex flex-col gap-3">
          <Select
            label="Conta contratante (onde as soluções desse contrato vão aparecer)"
            // Só o label carrega o status — o value continua sendo a.name, que é
            // a chave do join com Contract.contratante.
            options={activeAccounts.map(a => ({
              value: a.name,
              label: a.provisioningStatus === 'COMPLETED'
                ? a.name
                : `${a.name} — Fase 1: ${FASE1_BADGE[a.provisioningStatus].label}`,
            }))}
            placeholder="Selecione"
            value={contratante}
            onChange={e => setContratante(e.target.value)}
          />

          {/* Exige selectedAccount: fase1Bloqueada também é true quando nada está
              selecionado, e aí a mensagem "desta conta…" não faria sentido. */}
          {fase1Bloqueada && selectedAccount && (
            <Fase1BlockedWarning account={selectedAccount} />
          )}
        </div>

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
              <div className="grid grid-cols-4 gap-2">
                {COLS.map(col => (
                  <p key={col} className="text-xs text-[#6b7280] leading-4">{col}</p>
                ))}
              </div>
              <Divider />
              {/* Linhas */}
              {objetos.map((obj, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <p className="text-sm text-[#030712] truncate">{obj.solucao}</p>
                  <p className="text-sm text-[#030712] truncate">{obj.orgContratada}</p>
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
  )
}

// ── Passo 2 — revisão / checkout ──────────────────────────────

function StepReview({
  contratante, selectedAccount, fase1Bloqueada, objetos,
}: {
  contratante: string
  selectedAccount: Account | undefined
  fase1Bloqueada: boolean
  objetos: ObjetoContrato[]
}) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <SectionTitle>Conta contratante</SectionTitle>
        <div className="flex items-center justify-between border border-[#e5e7eb] rounded-2xl p-4">
          <p className="text-sm font-medium text-[#030712]">{contratante || '—'}</p>
          {selectedAccount && (
            <Badge variant={FASE1_BADGE[selectedAccount.provisioningStatus].variant} showIcon>
              Fase 1: {FASE1_BADGE[selectedAccount.provisioningStatus].label}
            </Badge>
          )}
        </div>
      </div>

      {fase1Bloqueada && selectedAccount && (
        <Fase1BlockedWarning account={selectedAccount} />
      )}

      <Divider />

      <div className="flex flex-col gap-3">
        <SectionTitle>Soluções que serão provisionadas (Fase 2)</SectionTitle>
        <div className="border border-[#e5e7eb] rounded-2xl p-4 flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-2">
            {COLS.map(col => (
              <p key={col} className="text-xs text-[#6b7280] leading-4">{col}</p>
            ))}
          </div>
          <Divider />
          {objetos.map((obj, i) => (
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
          Ao confirmar, o contrato será criado e a Fase 2 do provisionamento será disparada
          automaticamente para esta conta, cobrindo {objetos.length} solução(ões).
        </p>
      </div>
    </div>
  )
}

// ── Sheet principal ────────────────────────────────────────────

export function NewContractSheet({ open, onClose, orgId, orgName, accounts, solutions, onSave }: Props) {
  const { toasts, toast, dismiss } = useToast()
  const activeAccounts = accounts.filter(a => !a.deletedAt)
  const activeSolutions = solutions.filter(s => s.status !== 'Inativo')

  const [contratante, setContratante] = useState(() => activeAccounts[0]?.name ?? '')
  const [form, setForm] = useState({ dataInicio: '', dataTermino: '', renovacao: '' })
  const [objetos, setObjetos] = useState<ObjetoContrato[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  // step 1 = formulário; step 2 = revisão/checkout antes de confirmar
  const [step, setStep] = useState<1 | 2>(1)

  const selectedAccount = activeAccounts.find(a => a.name === contratante)
  // Fase 2 (provisionamento das soluções deste contrato) exige a Fase 1 da
  // conta concluída — regra confirmada com o arquiteto do worker.
  const fase1Bloqueada = selectedAccount?.provisioningStatus !== 'COMPLETED'

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

  function reset() {
    setContratante('')
    setObjetos([])
    setForm({ dataInicio: '', dataTermino: '', renovacao: '' })
    setStep(1)
  }

  function handleClose() {
    reset()
    onClose()
  }

  /** Passo 1 → 2: mesma validação de sempre, mas agora só avança para a revisão. */
  function handleReview() {
    if (fase1Bloqueada) return // gate — o botão já nasce desabilitado neste caso

    const missing: string[] = []
    if (!form.dataInicio) missing.push('Informe a data de início.')
    if (!form.dataTermino) missing.push('Informe a data de término.')
    if (!form.renovacao) missing.push('Selecione o tipo de renovação.')

    if (missing.length > 0) {
      toast(`Não foi possível continuar.\n${missing.join('\n')}`, 'warning')
      return
    }

    if (form.dataInicio && form.dataTermino && form.dataTermino <= form.dataInicio) {
      toast('A data de término deve ser posterior à data de início.', 'warning')
      return
    }

    if (objetos.length === 0) {
      toast('Adicione ao menos um objeto ao contrato para continuar.', 'warning')
      return
    }

    setStep(2)
  }

  /** Passo 2: confirma e efetivamente cria o contrato (dispara a Fase 2). */
  function handleConfirm() {
    if (fase1Bloqueada) return // segundo gate — defesa contra estado obsoleto do botão
    onSave({
      orgId,
      contratante: contratante || activeAccounts[0]?.name || orgName,
      objetos,
      dataInicio: form.dataInicio,
      dataTermino: form.dataTermino,
      renovacao: form.renovacao,
      status: 'Ativo',
    })
    reset()
    onClose()
  }

  const footerStep1 = (
    <>
      <Button variant="outline" onClick={handleClose}>Cancelar</Button>
      <Button onClick={handleReview} disabled={fase1Bloqueada}>Revisar</Button>
    </>
  )

  const footerStep2 = (
    <>
      <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
      <Button onClick={handleConfirm} disabled={fase1Bloqueada}>Criar contrato</Button>
    </>
  )

  return (
    <>
      <Sheet
        open={open}
        onClose={handleClose}
        title={step === 1 ? 'Novo Contrato' : 'Revisar contrato'}
        width="w-[640px]"
        footer={step === 1 ? footerStep1 : footerStep2}
      >
        {step === 1 ? (
          <StepForm
            activeAccounts={activeAccounts}
            contratante={contratante}
            setContratante={setContratante}
            objetos={objetos}
            handleOpenAddObjeto={handleOpenAddObjeto}
            form={form}
            set={set}
          />
        ) : (
          <StepReview
            contratante={contratante}
            selectedAccount={selectedAccount}
            fase1Bloqueada={fase1Bloqueada}
            objetos={objetos}
          />
        )}
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
