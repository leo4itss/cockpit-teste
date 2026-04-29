import { Check, History, ChevronDown, ChevronUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { ProvisioningDots } from './ProvisioningDots'
import { api } from '@/api/client'
import type { Contract, ContractVersion } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  contract: Contract | null
  onEdit?: () => void
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb]" />
}

function ReadonlyField({ label, value, half }: { label: string; value?: string | number; half?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 ${half ? 'flex-1 min-w-0' : ''}`}>
      <label className="text-sm font-medium text-[#030712]">{label}</label>
      <div className="h-9 px-3 flex items-center bg-[#f9fafb] border border-[#e5e7eb] rounded-md text-sm text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] truncate">
        {value ?? '—'}
      </div>
    </div>
  )
}

function CriadoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16a34a]">
      <span className="w-4 h-4 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0">
        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
      </span>
      Criado
    </span>
  )
}

function ObjetoField({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-sm font-semibold text-[#030712]">{label}</p>
      <p className="text-sm text-[#6b7280]">{value ?? '—'}</p>
    </div>
  )
}

export function ContractDetailSheet({ open, onClose, contract, onEdit }: Props) {
  if (!contract) return null

  const shortId = contract.id.length > 8 ? `${contract.id.substring(0, 8)}…` : contract.id

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhe Contrato"
      width="w-[640px]"
      headerAction={onEdit ? (
        <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
      ) : undefined}
    >
      <div className="flex flex-col gap-6">

        {/* ── Identificação ─────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-semibold text-[#030712]">Contrato: {shortId}</p>
          <CriadoBadge />
        </div>

        <Divider />

        {/* ── Dados do contrato ─────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Dados do contrato</SectionTitle>
          <ReadonlyField label="Conta contratante" value={contract.contratante} />
        </div>

        <Divider />

        {/* ── Vigência ──────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Vigência</SectionTitle>
          <div className="flex gap-4 items-start">
            <ReadonlyField label="Data de início" value={contract.dataInicio} half />
            <ReadonlyField label="Data de fim" value={contract.dataTermino} half />
          </div>
        </div>

        <Divider />

        {/* ── Renovação ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Renovação</SectionTitle>
          <ReadonlyField label="Tipo de renovação" value={contract.renovacao} />
        </div>

        <Divider />

        {/* ── Objetos do contrato ───────────────────────── */}
        <div className="flex flex-col gap-4">
          <SectionTitle>Objetos do contrato</SectionTitle>

          {contract.objetos.length === 0 ? (
            <p className="text-sm text-[#9ca3af]">Nenhum objeto adicionado.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {contract.objetos.map((obj, i) => (
                <div
                  key={i}
                  className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl p-4 flex flex-col gap-3"
                >
                  <ObjetoField label="Solução" value={obj.solucao} />
                  <ObjetoField label="Plano" value={obj.plano} />
                  <ObjetoField label="Licença" value={obj.licenciamento} />
                  <ObjetoField label="Organização contratada" value={obj.orgContratada} />
                  <ObjetoField label="Qtd contratada" value={obj.qtdContratada} />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-[#030712]">Status da publicação</p>
                    <ProvisioningDots status="COMPLETED" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Sheet>
  )
}
