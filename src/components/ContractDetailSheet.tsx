import { Sheet } from './ui/Sheet'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import type { Contract } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  contract: Contract | null
  onEdit?: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb]" />
}

function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-[#030712]">{label}</p>
      <p className="text-sm text-gray-500">{value ?? '—'}</p>
    </div>
  )
}

export function ContractDetailSheet({ open, onClose, contract, onEdit }: Props) {
  if (!contract) return null

  const statusVariant =
    contract.status === 'Ativo' ? 'success'
    : contract.status === 'Pendente' ? 'warning'
    : 'default'

  return (
    <Sheet open={open} onClose={onClose} title="Detalhe do Contrato" width="w-[768px]">
      <div className="flex flex-col gap-6">

        {/* Contract header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
              {contract.contratante.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#030712]">{contract.contratante}</p>
              <Badge variant={statusVariant}>{contract.status}</Badge>
            </div>
          </div>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
          )}
        </div>

        <Divider />

        {/* ID do contrato */}
        <Field label="ID do contrato" value={`${contract.id.substring(0, 8)}…`} />

        <Divider />

        {/* Objetos do contrato */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Objetos do contrato</SectionTitle>

          {contract.objetos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum objeto adicionado.</p>
          ) : (
            <div className="rounded-xl border border-[#e5e7eb] overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    {['Solução', 'Org. contratada', 'Plano', 'Licenciamento', 'Qtd'].map(col => (
                      <th
                        key={col}
                        className="px-3 py-2.5 text-left text-xs font-medium text-[#030712] opacity-40 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contract.objetos.map((obj, i) => (
                    <tr key={i} className="border-b border-[#e5e7eb] last:border-0">
                      <td className="px-3 py-3 text-sm text-[#030712]">{obj.solucao}</td>
                      <td className="px-3 py-3 text-sm text-[#030712]">{obj.orgContratada}</td>
                      <td className="px-3 py-3 text-sm text-[#030712]">{obj.plano}</td>
                      <td className="px-3 py-3 text-sm text-[#030712] max-w-[200px] truncate">{obj.licenciamento}</td>
                      <td className="px-3 py-3 text-sm text-[#030712]">{obj.qtdContratada}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Divider />

        {/* Vigência */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Vigência</SectionTitle>
          <div className="flex flex-col gap-6">
            <Field label="Data de início" value={contract.dataInicio} />
            <Field label="Data de término" value={contract.dataTermino} />
            <Field label="Renovação" value={contract.renovacao} />
          </div>
        </div>

      </div>
    </Sheet>
  )
}
