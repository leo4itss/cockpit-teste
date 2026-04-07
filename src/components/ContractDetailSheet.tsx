import { Sheet } from './ui/Sheet'
import { Badge } from './ui/Badge'
import type { Contract } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  contract: Contract | null
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

export function ContractDetailSheet({ open, onClose, contract }: Props) {
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
        </div>

        <Divider />

        {/* Partes */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Partes</SectionTitle>
          <div className="flex flex-col gap-6">
            <Field label="Conta contratante" value={contract.contratante} />
            <Field label="Organização contratada" value={contract.orgContratada} />
          </div>
        </div>

        <Divider />

        {/* Solução e plano */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Solução e plano</SectionTitle>
          <div className="flex flex-col gap-6">
            <Field label="Solução" value={contract.solucoes} />
            <Field label="Plano" value={contract.plano} />
            <Field label="Quantidade contratada" value={contract.qtdContratada} />
          </div>
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
