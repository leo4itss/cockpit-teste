// Modal de confirmação de exclusão — 3 variantes:
// - 'org': exige digitação do nome, lista impactos
// - 'account': apenas confirmação por botão
// - 'blocked': informativo, lista dependências que bloqueiam

import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { AlertTriangle, Info, RotateCcw } from 'lucide-react'

interface BlockedInfo {
  activeAccounts: number
  activeContracts: number
}

interface Props {
  open: boolean
  onClose: () => void
  variant: 'org' | 'account' | 'blocked'
  name: string            // nome da org ou conta
  onConfirm?: () => void  // não usado em 'blocked'
  blocked?: BlockedInfo   // usado em 'blocked'
}

export function ConfirmDeleteModal({ open, onClose, variant, name, onConfirm, blocked }: Props) {
  const [typed, setTyped] = useState('')

  function handleClose() {
    setTyped('')
    onClose()
  }

  function handleConfirm() {
    setTyped('')
    onConfirm?.()
  }

  // --- BLOCKED ---
  if (variant === 'blocked') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Não é possível excluir esta organização"
        maxWidth="max-w-[480px]"
        footer={
          <Button variant="secondary" onClick={handleClose}>Fechar</Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Resolva as dependências abaixo antes de excluir.
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-[#030712]">
            {(blocked?.activeAccounts ?? 0) > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span><strong>{blocked!.activeAccounts}</strong> conta{blocked!.activeAccounts !== 1 ? 's' : ''} ativa{blocked!.activeAccounts !== 1 ? 's' : ''} vinculada{blocked!.activeAccounts !== 1 ? 's' : ''}</span>
              </li>
            )}
            {(blocked?.activeContracts ?? 0) > 0 && (
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span><strong>{blocked!.activeContracts}</strong> contrato{blocked!.activeContracts !== 1 ? 's' : ''} ativo{blocked!.activeContracts !== 1 ? 's' : ''} vigente{blocked!.activeContracts !== 1 ? 's' : ''}</span>
              </li>
            )}
          </ul>
        </div>
      </Modal>
    )
  }

  // --- ACCOUNT ---
  if (variant === 'account') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Excluir conta"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirm}>Excluir</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>Tem certeza que deseja excluir a conta <strong>"{name}"</strong>?</p>
          <div className="flex flex-col gap-1.5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-medium">Esta ação é irreversível:</p>
            <ul className="flex flex-col gap-1 pl-3 list-disc list-outside text-xs">
              <li>A conta perderá acesso imediato a todas as soluções</li>
              <li>Os dados serão preservados por 30 dias e então removidos permanentemente</li>
            </ul>
          </div>
        </div>
      </Modal>
    )
  }

  // --- ORG ---
  const canConfirm = typed === name

  // Data prevista de exclusão permanente (hoje + 30 dias)
  const exclusaoPermanente = new Date()
  exclusaoPermanente.setDate(exclusaoPermanente.getDate() + 30)
  const exclusaoFormatada = exclusaoPermanente.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Excluir organização"
      maxWidth="max-w-[480px]"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm}>
            Excluir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm text-[#030712]">
        <p>
          Esta organização entrará em um período de <strong>quarentena de 30 dias</strong> antes
          de ser excluída permanentemente. Durante esse período, os seguintes itens
          ficarão inacessíveis e serão excluídos permanentemente após 30 dias:
        </p>
        <ul className="flex flex-col gap-1.5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs list-disc list-outside pl-6">
          <li>Todas as contas vinculadas</li>
          <li>Todos os contratos</li>
          <li>Todas as soluções</li>
          <li>Todos os dados associados</li>
        </ul>

        {/* Bloco informativo — quarentena */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs text-blue-800">
            <p>
              Durante os 30 dias de quarentena, você poderá cancelar a exclusão
              acessando a opção <strong>"Cancelar exclusão"</strong> no menu de ações
              da organização.
            </p>
            <p className="font-medium">
              Exclusão permanente prevista para: {exclusaoFormatada}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#030712]">
            Digite <strong>"{name}"</strong> para confirmar:
          </label>
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={name}
            className="w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-[#030712] placeholder:text-[#9ca3af] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </Modal>
  )
}
