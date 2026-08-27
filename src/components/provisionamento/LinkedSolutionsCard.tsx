import { Card, SectionTitle, Divider, EmptyState } from './ProvisioningCard'
import { Badge } from '@/components/ui/Badge'
import type { Solution } from '@/types'

function statusBadge(status: Solution['status']) {
  if (status === 'Ativo' || status === 'Criado') return <Badge variant="success" showIcon>{status}</Badge>
  return <Badge variant="secondary" showIcon>{status}</Badge>
}

function publicacaoBadge(marketplaceStatus: Solution['marketplaceStatus']) {
  if (!marketplaceStatus) return <span className="text-xs text-[#9ca3af]">—</span>
  const variant = marketplaceStatus === 'Publicado' ? 'success' : 'default'
  return <Badge variant={variant}>{marketplaceStatus}</Badge>
}

export function LinkedSolutionsCard({
  solutions,
  accountName,
}: {
  solutions: Solution[]
  accountName: string
}) {
  return (
    <Card className="flex flex-col gap-4">
      <SectionTitle>Soluções vinculadas</SectionTitle>
      <Divider />
      {solutions.length === 0 ? (
        <EmptyState
          title="Nenhuma solução vinculada"
          description={`Nenhuma solução foi encontrada para «${accountName}» através dos contratos ativos. O vínculo é resolvido por correspondência de nome — verifique o campo Contratante dos contratos desta conta.`}
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              <th className="text-left px-2 pb-2.5 text-xs font-medium text-[#030712] opacity-40 h-8">Solução</th>
              <th className="text-left px-2 pb-2.5 text-xs font-medium text-[#030712] opacity-40 h-8">Status</th>
              <th className="text-left px-2 pb-2.5 text-xs font-medium text-[#030712] opacity-40 h-8">Status de publicação</th>
            </tr>
          </thead>
          <tbody>
            {solutions.map(s => (
              <tr key={s.id} className="border-b border-[#e5e7eb] last:border-0">
                <td className="px-2 py-2.5 text-sm font-medium text-[#030712]">{s.name}</td>
                <td className="px-2 py-2.5">{statusBadge(s.status)}</td>
                <td className="px-2 py-2.5">{publicacaoBadge(s.marketplaceStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
