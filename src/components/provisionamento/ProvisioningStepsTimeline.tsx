import { useState } from 'react'
import { Card, SectionTitle, Divider } from './ProvisioningCard'
import { ProvisioningStepRow } from './ProvisioningStepRow'
import { PROVISIONING_STEPS } from '@/services/provisioning'
import type { ProvisioningStep, ProvisioningStepId } from '@/types'

export function ProvisioningStepsTimeline({ steps }: { steps: ProvisioningStep[] }) {
  const [expandedId, setExpandedId] = useState<ProvisioningStepId | null>(null)

  return (
    <Card className="flex flex-col gap-1">
      <SectionTitle>Etapas do provisionamento</SectionTitle>
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
    </Card>
  )
}
