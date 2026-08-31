/**
 * Badge de escopo de grupo — global, organização ou conta.
 *
 * Era três cópias idênticas (GrupoDetailSheet, PainelAcessos, GruposPage) que
 * começaram a divergir quando o escopo 'global' entrou. Agora é uma só.
 */

import { Badge } from '@/components/ui/Badge'

export function EscopoBadge({ escopo }: { escopo: 'global' | 'org' | 'conta' }) {
  if (escopo === 'global') {
    return <Badge variant="default" className="bg-emerald-50 text-emerald-700 border border-emerald-200">Global</Badge>
  }
  if (escopo === 'org') {
    return <Badge variant="info">Organização</Badge>
  }
  return <Badge variant="default" className="bg-violet-50 text-violet-700 border border-violet-200">Conta</Badge>
}
