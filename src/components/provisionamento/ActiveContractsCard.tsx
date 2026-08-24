import { Card, SectionTitle, Divider, EmptyState } from './ProvisioningCard'
import { ContractStatusBadge } from '@/components/ContractStatusBadge'
import { formatarData } from '@/lib/datas'
import type { Contract } from '@/types'

export function ActiveContractsCard({
  contracts,
  accountName,
}: {
  contracts: Contract[]
  accountName: string
}) {
  return (
    <Card className="flex flex-col gap-4">
      <SectionTitle>Contratos ativos</SectionTitle>
      <Divider />
      {contracts.length === 0 ? (
        <EmptyState
          title="Nenhum contrato ativo encontrado"
          description={`Nenhum contrato ativo foi encontrado para «${accountName}». O vínculo é resolvido por correspondência exata de nome — verifique se o campo Contratante do contrato coincide com o nome da conta.`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {contracts.map(c => (
            <div key={c.id} className="border border-[#e5e7eb] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-[#030712]">{c.contratante}</p>
                <ContractStatusBadge status={c.status} />
              </div>
              <p className="text-xs text-[#6b7280]">
                Vigência: {formatarData(c.dataInicio)} até {formatarData(c.dataTermino)}
              </p>
              {c.objetos.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[#e5e7eb]">
                  {c.objetos.map((o, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-[#030712] font-medium">{o.solucao}</span>
                      <span className="text-[#6b7280]">Plano: {o.plano}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
