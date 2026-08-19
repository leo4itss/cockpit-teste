/**
 * Badge de status do contrato — fonte única do mapeamento estado → cor/ícone.
 *
 * Existe para que listagem, detalhe e tela de provisionamento nunca divirjam.
 * Antes do handoff de 19/08/2026 cada tela tinha o seu próprio mapeamento
 * inline, e o detalhe chegava a exibir 'Criado' com o rótulo 'Ativo'.
 *
 * Regra que este componente protege: **'Ativo' só aparece quando o
 * provisionamento das soluções conclui**. 'Provisionando' é um estado de
 * trabalho em curso (ícone girando), não um erro.
 */

import { Loader2 } from 'lucide-react'
import { Badge } from './ui/Badge'
import type { ContractStatus } from '@/types'

const MAPA: Record<ContractStatus, { variant: 'success' | 'warning' | 'error' | 'info' | 'secondary'; icone: boolean }> = {
  'Ativo': { variant: 'success', icone: true },
  'Provisionando': { variant: 'info', icone: false },
  'Falha no provisionamento': { variant: 'error', icone: false },
  'Pendente': { variant: 'warning', icone: false },
  'Inativo': { variant: 'secondary', icone: true },
}

const PADRAO = { variant: 'secondary' as const, icone: false }

export function ContractStatusBadge({ status }: { status: ContractStatus | string }) {
  const cfg = MAPA[status as ContractStatus] ?? PADRAO

  return (
    <Badge variant={cfg.variant} showIcon={cfg.icone}>
      {status === 'Provisionando' && <Loader2 className="w-3 h-3 shrink-0 animate-spin" />}
      {status}
    </Badge>
  )
}
