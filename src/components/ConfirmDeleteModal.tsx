// Modal de confirmação de exclusão — variantes:
// - 'org': exige digitação do nome, lista impactos
// - 'account': apenas confirmação por botão
// - 'blocked': informativo, lista dependências que bloqueiam
// - 'inativar-org': inativação reversível de org
// - 'inativar-solucao': inativação de solução (avisa sobre contratos)
// - 'inativar-contrato': inativação simples de contrato
// - 'excluir-componente': exclusão permanente sem vínculos
// - 'inativar-componente': soft delete por vínculo com soluções
// - 'reprovisionar': reexecuta o provisionamento de um tenant (infra destrutiva)

import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { AlertTriangle, CircleAlert, RotateCcw } from 'lucide-react'

interface BlockedInfo {
  activeAccounts: number
  activeContracts: number
}

interface Props {
  open: boolean
  onClose: () => void
  variant: 'org' | 'account' | 'contract' | 'solution' | 'blocked' | 'inativar-org' | 'inativar-conta' | 'excluir-conta' | 'excluir-org' | 'inativar-solucao' | 'inativar-contrato' | 'excluir-componente' | 'inativar-componente' | 'reprovisionar'
  name: string            // nome da org, conta, contrato ou solução
  onConfirm?: () => void  // não usado em 'blocked'
  blocked?: BlockedInfo   // usado em 'blocked'
  blockedTitle?: string   // título customizável para o variant 'blocked'
}

export function ConfirmDeleteModal({ open, onClose, variant, name, onConfirm, blocked, blockedTitle }: Props) {
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
        title={blockedTitle ?? 'Não é possível excluir esta organização'}
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

  // --- SOLUTION ---
  if (variant === 'solution') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Excluir solução"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirm}>Excluir</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>Tem certeza que deseja excluir a solução <strong>"{name}"</strong>?</p>
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">
              Esta ação é <strong>irreversível</strong>. A solução e todos os seus planos serão removidos permanentemente.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- CONTRACT ---
  if (variant === 'contract') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Excluir contrato"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirm}>Excluir</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>Tem certeza que deseja excluir o contrato de <strong>"{name}"</strong>?</p>
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">
              Esta ação é <strong>irreversível</strong>. O contrato e todos os seus objetos serão removidos permanentemente.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- ACCOUNT ---
  if (variant === 'account') {
    const exclusaoPermanente = new Date()
    exclusaoPermanente.setDate(exclusaoPermanente.getDate() + 30)
    const exclusaoFormatada = exclusaoPermanente.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

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
          <p>A conta <strong>"{name}"</strong> entrará em um período de <strong>quarentena de 30 dias</strong> antes de ser excluída permanentemente.</p>
          <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
            <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-700 leading-5">
              Durante os 30 dias de quarentena, você poderá cancelar a exclusão ativando
              <strong> "Exibir contas deletadas"</strong> e clicando em{' '}
              <RotateCcw className="inline w-3 h-3 mb-0.5" /> <strong>Cancelar exclusão</strong>.
              <br />
              <span className="font-semibold">Exclusão permanente prevista para: {exclusaoFormatada}</span>
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- INATIVAR-ORG ---
  if (variant === 'inativar-org') {
    const canConfirm = typed === name
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Inativar organização"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`bg-amber-500 hover:bg-amber-600 text-white ${!canConfirm ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Inativar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>
            Ao inativar esta organização, os seguintes itens serão <strong>automaticamente inativados</strong>:
          </p>
          <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4">
            <ul className="flex flex-col gap-1 text-sm font-medium text-yellow-700 list-disc list-outside pl-5">
              <li>Todas as contas vinculadas</li>
              <li>Todos os contratos</li>
              <li>Todas as soluções</li>
            </ul>
          </div>

          <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
            <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-700 leading-5">
              Esta ação <strong>pode ser desfeita</strong>. Para reativar a organização e seus vínculos,
              acesse o menu de ações da organização e selecione <strong>"Reativar organização"</strong>.
            </p>
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
              className="w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-[#030712] placeholder:text-[#9ca3af] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </Modal>
    )
  }

  // --- EXCLUIR-CONTA ---
  if (variant === 'excluir-conta') {
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
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">
              Esta ação é <strong>irreversível</strong>. A conta e todos os seus dados serão removidos permanentemente.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- INATIVAR-CONTA ---
  if (variant === 'inativar-conta') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Inativar conta"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleConfirm}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Inativar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>
            Ao inativar a conta <strong>"{name}"</strong>, os seguintes itens serão <strong>automaticamente inativados</strong>:
          </p>
          <ul className="flex flex-col gap-1.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs list-disc list-outside pl-6">
            <li>Todos os contratos vinculados a esta conta</li>
            <li>Todas as soluções vinculadas a esta conta</li>
          </ul>
          <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
            <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-700 leading-5">
              Esta ação <strong>pode ser desfeita</strong>. Para reativar a conta,
              acesse o menu de edição e clique em <strong>"Ativar conta"</strong>.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- INATIVAR-SOLUCAO ---
  if (variant === 'inativar-solucao') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Inativar solução"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleConfirm}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Inativar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>
            Tem certeza que deseja inativar a solução <strong>"{name}"</strong>?
          </p>
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-xs text-amber-800">
              <p>
                Ao inativar esta solução, <strong>todos os contratos vinculados</strong> serão
                automaticamente inativados.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
            <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-700 leading-5">
              Esta ação <strong>pode ser desfeita</strong>. Para reativar a solução,
              acesse o menu de edição e clique em <strong>"Ativar solução"</strong>.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- EXCLUIR-ORG ---
  if (variant === 'excluir-org') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Excluir organização"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirm}>Excluir</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>Tem certeza que deseja excluir a organização <strong>"{name}"</strong>?</p>
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">
              Esta ação é <strong>irreversível</strong>. A organização e todos os seus dados serão removidos permanentemente.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- INATIVAR-CONTRATO ---
  if (variant === 'inativar-contrato') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Inativar contrato"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleConfirm}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Inativar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>
            Tem certeza que deseja inativar o contrato de <strong>"{name}"</strong>?
          </p>
          <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
            <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-700 leading-5">
              Esta ação <strong>pode ser desfeita</strong>. Para reativar o contrato,
              acesse o menu de edição e clique em <strong>"Ativar contrato"</strong>.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- EXCLUIR COMPONENTE (sem vínculos) ---
  if (variant === 'excluir-componente') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Excluir componente"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirm}>Excluir permanentemente</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#374151]">
            Você está prestes a excluir permanentemente o componente <strong>"{name}"</strong>.
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
            <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-700 leading-5">
              Este componente não está vinculado a nenhuma solução e pode ser excluído com segurança.
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- INATIVAR COMPONENTE (com vínculos) ---
  if (variant === 'inativar-componente') {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Inativar componente"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button variant="ghost" onClick={handleConfirm} className="text-amber-600 hover:bg-amber-50">
              Inativar componente
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#374151]">
            O componente <strong>"{name}"</strong> está vinculado a soluções existentes e não pode ser excluído.
            Ele será inativado e não ficará disponível para novas soluções.
          </p>
          <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4">
            <ul className="flex flex-col gap-1 text-sm font-medium text-yellow-700 list-disc list-outside pl-5">
              <li>O componente não aparecerá mais ao criar ou editar soluções</li>
              <li>As soluções que já utilizam este componente não são afetadas</li>
              <li>Você poderá reativar o componente a qualquer momento</li>
            </ul>
          </div>
          <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
            <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-700 leading-5">
              A inativação é reversível. Para reativar, acesse o componente e clique em "Reativar".
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  // --- REPROVISIONAR ---
  if (variant === 'reprovisionar') {
    const canConfirm = typed === name
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Reprovisionar tenant"
        maxWidth="max-w-[480px]"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm}>
              Reprovisionar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-sm text-[#030712]">
          <p>
            O worker vai reexecutar as etapas de provisionamento deste tenant, recriando
            os recursos de infraestrutura pendentes ou com falha:
          </p>
          <div className="bg-red-50 border border-red-300 rounded-md p-4">
            <ul className="flex flex-col gap-1 text-sm font-medium text-red-700 list-disc list-outside pl-5">
              <li>Banco de dados PostgreSQL do tenant</li>
              <li>Realm e configurações no Keycloak</li>
              <li>Registro DNS (CNAME) no Cloudflare</li>
              <li>Ingress e certificado TLS</li>
              <li>Variáveis de ambiente no Infisical</li>
            </ul>
          </div>

          <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
            <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-blue-700 leading-5">
              Usuários deste tenant podem perder acesso temporariamente enquanto o
              provisionamento é reexecutado.
            </p>
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
              className="w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-[#030712] placeholder:text-[#9ca3af] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-red-500"
            />
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
        <div className="bg-red-50 border border-red-300 rounded-md p-4">
          <ul className="flex flex-col gap-1 text-sm font-medium text-red-700 list-disc list-outside pl-5">
            <li>Todas as contas vinculadas</li>
            <li>Todos os contratos</li>
            <li>Todas as soluções</li>
            <li>Todos os dados associados</li>
          </ul>
        </div>

        {/* Bloco informativo — quarentena */}
        <div className="flex items-start gap-4 bg-blue-50 border border-blue-300 rounded-md p-4">
          <CircleAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-blue-700 leading-5">
            Durante os 30 dias de quarentena, você poderá cancelar a exclusão
            acessando a opção <strong>"Cancelar exclusão"</strong> no menu de ações
            da organização.
            <br />
            <span className="font-semibold">Exclusão permanente prevista para: {exclusaoFormatada}</span>
          </p>
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
