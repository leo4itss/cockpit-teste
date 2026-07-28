import { CheckCircle2, Clock, Loader2, XCircle, Lock, FileQuestion, ExternalLink } from 'lucide-react'
import { Card, SectionTitle, Divider } from './ProvisioningCard'
import { cn } from '@/lib/utils'
import { deriveFase2Status } from '@/services/provisioning'
import type { ProvisioningOverallStatus, SolutionProvisioning } from '@/types'

const ESTADO_ICON: Record<SolutionProvisioning['estado'], typeof CheckCircle2> = {
  criado: CheckCircle2,
  pendente: Clock,
  'em-andamento': Loader2,
  erro: XCircle,
}

const ESTADO_LABEL: Record<SolutionProvisioning['estado'], string> = {
  criado: 'Criado',
  pendente: 'Pendente',
  'em-andamento': 'Em andamento',
  erro: 'Erro',
}

const ESTADO_TONE: Record<SolutionProvisioning['estado'], string> = {
  criado: 'text-[#16a34a]',
  pendente: 'text-[#9ca3af]',
  'em-andamento': 'text-[#2563eb]',
  erro: 'text-[#dc2626]',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

function SolutionRow({ solucao }: { solucao: SolutionProvisioning }) {
  const Icon = ESTADO_ICON[solucao.estado]
  const hasDetails = Boolean(solucao.detalhes && Object.keys(solucao.detalhes).length > 0)

  return (
    <div className="flex flex-col py-3">
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', ESTADO_TONE[solucao.estado], solucao.estado === 'em-andamento' && 'animate-spin')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#030712]">{solucao.solucaoNome}</p>
            <span className={cn('text-xs font-medium', ESTADO_TONE[solucao.estado])}>{ESTADO_LABEL[solucao.estado]}</span>
          </div>
          {hasDetails && (
            <p className="text-xs text-[#6b7280] mt-0.5">
              {Object.entries(solucao.detalhes!).map(([k, v], i) => (
                <span key={k}>{i > 0 && ' · '}{k}: {v}</span>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* Bloco de erro — sempre visível, mesmo padrão da Fase 1 */}
      {solucao.erro && (
        <div className="ml-8 mt-2 bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-red-700">{solucao.erro.codigo}</p>
            <span className="text-xs text-red-500">{solucao.erro.tentativas} tentativa(s)</span>
          </div>
          <p className="text-sm text-red-700">{solucao.erro.mensagem}</p>
          <p className="text-xs text-red-500">Ocorrido em {formatDate(solucao.erro.ocorridoEm)}</p>
          {solucao.erro.detalhe && (
            <pre className="text-xs text-red-800 bg-red-100/60 rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono">
              {solucao.erro.detalhe}
            </pre>
          )}
          {solucao.erro.docUrl && (
            <a href={solucao.erro.docUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline w-fit">
              Ver runbook <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Fase 2 — workflow `solutionPublicationByContract`. Disparada pela criação
 * do contrato, provisiona cada solução coberta e libera acesso. Não mexe em
 * DNS/Ingress (isso é Fase 1). Exige Fase 1 concluída — regra confirmada com
 * o arquiteto do worker: "provisionar solução só pode ocorrer se já tem
 * conta e contrato".
 */
export function Fase2ProvisioningCard({
  fase1Status,
  solucoes,
}: {
  fase1Status: ProvisioningOverallStatus
  solucoes: SolutionProvisioning[]
}) {
  const fase2Status = deriveFase2Status(fase1Status, solucoes)

  return (
    <Card className="flex flex-col gap-1">
      <SectionTitle>Fase 2 — Provisionamento por contrato</SectionTitle>
      <Divider />

      {fase2Status === 'bloqueada' ? (
        <div className="flex items-center gap-3 py-6">
          <Lock className="w-5 h-5 text-gray-300 shrink-0" />
          <p className="text-sm text-[#9ca3af]">
            Aguardando conclusão da Fase 1 para iniciar o provisionamento de soluções.
          </p>
        </div>
      ) : fase2Status === 'sem-contrato' ? (
        <div className="flex items-center gap-3 py-6">
          <FileQuestion className="w-5 h-5 text-gray-300 shrink-0" />
          <p className="text-sm text-[#9ca3af]">
            Nenhum contrato ativo — a Fase 2 inicia quando um contrato for criado para esta conta.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#f3f4f6]">
          {solucoes.map(s => <SolutionRow key={s.solucaoNome} solucao={s} />)}
        </div>
      )}
    </Card>
  )
}
