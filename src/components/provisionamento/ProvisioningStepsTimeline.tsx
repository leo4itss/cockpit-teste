import { useState } from 'react'
import { Info } from 'lucide-react'
import { Card, SectionTitle, Divider } from './ProvisioningCard'
import { ProvisioningStepRow } from './ProvisioningStepRow'
import { PROVISIONING_STEPS, FASE1_NOTA_GERAL } from '@/services/provisioning'
import type { ProvisioningStep, ProvisioningStepId } from '@/types'

export function ProvisioningStepsTimeline({ steps }: { steps: ProvisioningStep[] }) {
  const [expandedId, setExpandedId] = useState<ProvisioningStepId | null>(null)

  return (
    <Card className="flex flex-col gap-1">
      <SectionTitle>Fase 1 — Provisionamento da conta</SectionTitle>
      <Divider />
      <div className="flex flex-col divide-y divide-[#f3f4f6]">
        {PROVISIONING_STEPS.map(def => {
          const step = steps.find(s => s.id === def.id)
          if (!step) return null
          return (
            <ProvisioningStepRow
              key={def.id}
              def={def}
              step={step}
              expanded={expandedId === def.id}
              onToggle={() => setExpandedId(prev => (prev === def.id ? null : def.id))}
            />
          )
        })}
      </div>

      {/* Nota de fechamento — desfaz a leitura de que concluir a Fase 1 já
          entrega as soluções ao cliente (handoff 19/08/2026). */}
      <div className="mt-3 flex items-start gap-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-3">
        <Info className="w-4 h-4 text-[#9ca3af] shrink-0 mt-0.5" />
        <p className="text-xs text-[#6b7280] leading-relaxed">{FASE1_NOTA_GERAL}</p>
      </div>
    </Card>
  )
}
