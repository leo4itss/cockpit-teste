import { CheckCircle2, Clock, Loader2, XCircle, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { formatarDataHora } from '@/lib/datas'
import { ProvisioningErrorBlock } from './ProvisioningErrorBlock'
import { PROVISIONING_STEP_LABEL } from '@/services/provisioning'
import type { ProvisioningStep, ProvisioningStepDef } from '@/types'

const ESTADO_ICON: Record<ProvisioningStep['estado'], typeof CheckCircle2> = {
  criado: CheckCircle2,
  pendente: Clock,
  'em-andamento': Loader2,
  erro: XCircle,
}

const ESTADO_TONE: Record<ProvisioningStep['estado'], string> = {
  criado: 'text-[#16a34a]',
  pendente: 'text-[#9ca3af]',
  'em-andamento': 'text-[#2563eb]',
  erro: 'text-[#dc2626]',
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function ProvisioningStepRow({
  def,
  step,
  expanded,
  onToggle,
}: {
  def: ProvisioningStepDef
  step: ProvisioningStep
  expanded: boolean
  onToggle: () => void
}) {
  const Icon = ESTADO_ICON[step.estado]
  const hasDetails = Boolean(step.detalhes && Object.keys(step.detalhes).length > 0)

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-start gap-3 py-3 text-left w-full group"
      >
        <Icon
          className={cn('w-5 h-5 shrink-0 mt-0.5', ESTADO_TONE[step.estado], step.estado === 'em-andamento' && 'animate-spin')}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#030712]">{def.nome}</p>
            <Badge variant={def.escopo === 'global' ? 'info' : 'default'}>
              {def.escopo === 'global' ? 'Recurso global' : 'Recurso do tenant'}
            </Badge>
            <span className={cn('text-xs font-medium', ESTADO_TONE[step.estado])}>{PROVISIONING_STEP_LABEL[step.estado]}</span>
          </div>
          <p className="text-xs text-[#6b7280] mt-0.5">{def.descricao}</p>
          {def.impactoFalha && (
            <p className="text-xs text-[#6b7280] mt-1">
              <span className="text-[#9ca3af]">Se ela falhar: </span>{def.impactoFalha}
            </p>
          )}
          <p className="text-xs text-[#9ca3af] mt-1">{def.notaEscopo}</p>
        </div>
        {(hasDetails || step.estado === 'criado') && (
          <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform', expanded && 'rotate-180')} />
        )}
      </button>

      {/* Bloco de erro — sempre visível quando há falha, independente do expand */}
      {step.erro && <ProvisioningErrorBlock erro={step.erro} className="ml-8 mb-3" />}

      {/* Detalhes expansíveis — timestamps, duração e metadados do worker */}
      {expanded && (
        <div className="ml-8 mb-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-[#9ca3af]">Início</p>
              <p className="text-[#030712] font-medium">{formatarDataHora(step.iniciadoEm)}</p>
            </div>
            <div>
              <p className="text-[#9ca3af]">Fim</p>
              <p className="text-[#030712] font-medium">{formatarDataHora(step.concluidoEm)}</p>
            </div>
            <div>
              <p className="text-[#9ca3af]">Duração</p>
              <p className="text-[#030712] font-medium">{formatDuration(step.duracaoMs)}</p>
            </div>
          </div>
          {hasDetails && (
            <div className="flex flex-col gap-1 pt-2 border-t border-[#e5e7eb]">
              {Object.entries(step.detalhes!).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="text-[#9ca3af] w-32 shrink-0 truncate">{k}</span>
                  <span className="text-[#030712] font-mono truncate">{v}</span>
                </div>
              ))}
            </div>
          )}
          <div className="pt-2 border-t border-[#e5e7eb] text-xs text-[#6b7280]">
            <span className="font-medium text-[#030712]">Recurso global: </span>{def.recursoGlobal || '—'}
            <br />
            <span className="font-medium text-[#030712]">Recurso do tenant: </span>{def.recursoTenant || '—'}
          </div>
        </div>
      )}
    </div>
  )
}
