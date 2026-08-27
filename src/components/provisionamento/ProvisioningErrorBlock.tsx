/**
 * Bloco de detalhe de falha — fonte única.
 *
 * Usado pela etapa da Fase 1, pela solução da Fase 2 e pelo detalhe do
 * contrato. Antes existiam duas cópias divergentes deste markup e o detalhe do
 * contrato viraria a terceira — o mesmo caminho que levou o mapa de status a
 * ter quatro versões diferentes na mesma tela.
 *
 * Mostra sempre o que a investigação precisa: o código do erro, quantas
 * tentativas houve, a mensagem funcional, quando ocorreu e — quando o worker
 * fornece — a resposta técnica original.
 *
 * `acao` é o espaço para o botão "Tentar novamente". Fica opcional porque nem
 * todo contexto age sobre o erro: o detalhe do contrato apenas diagnostica.
 */

import type { ReactNode } from 'react'
import { formatarDataHora } from '@/lib/datas'
import type { ProvisioningStepError } from '@/types'

export function ProvisioningErrorBlock({
  erro,
  acao,
  className = '',
}: {
  erro: ProvisioningStepError
  acao?: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-red-700">{erro.codigo}</p>
        <span className="text-xs text-red-500">
          {erro.tentativas === 1 ? '1 tentativa' : `${erro.tentativas} tentativas`}
        </span>
      </div>

      <p className="text-sm text-red-700">{erro.mensagem}</p>
      <p className="text-xs text-red-500">Ocorrido em {formatarDataHora(erro.ocorridoEm)}</p>

      {erro.detalhe && (
        <pre className="text-xs text-red-800 bg-red-100/60 rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono">
          {erro.detalhe}
        </pre>
      )}

      {acao && <div className="pt-1">{acao}</div>}
    </div>
  )
}
