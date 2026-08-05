/**
 * Camada de serviço de provisionamento de tenant.
 *
 * Único ponto de troca entre mock e o pas-cockpit-worker real: a constante
 * `USE_MOCK_PROVISIONING` abaixo. Quando o worker expuser o endpoint, trocar
 * para `false` e implementar a chamada HTTP dentro de `getProvisioning` —
 * nenhum outro arquivo desta feature precisa mudar.
 */

import type {
  ProvisioningStepDef,
  ProvisioningStepId,
  ProvisioningStep,
  ProvisioningStepState,
  ProvisioningOverallStatus,
  ProvisioningSummary,
  ProvisioningSnapshot,
  SolutionProvisioning,
  Fase2Status,
  HealthCheckResult,
  ProvisioningLogPage,
  ReprovisionResult,
} from '@/types'
import {
  provisioningSnapshots,
  provisioningHealth,
  provisioningLogs,
} from '@/data/mock'

// ── Catálogo de passos ───────────────────────────────────────

/**
 * Fonte única de verdade dos 5 passos da Fase 1 (workflow `tenantProvisioning`
 * do worker, confirmado com o dev e o arquiteto). Ordem real de execução:
 * Keycloak → Banco → Secrets (Infisical) → DNS → Ingress. A Fase 2
 * (`solutionPublicationByContract`, disparada pelo contrato) é modelada
 * separadamente — ver `SolutionProvisioning` em src/types/provisioning.ts.
 */
export const PROVISIONING_STEPS: readonly ProvisioningStepDef[] = [
  {
    id: 'keycloak', ordem: 1,
    nome: 'Autenticação', subtitulo: 'Login e usuários do tenant',
    descricao: 'Cria o espaço de autenticação isolado do tenant, clients OIDC, mappers e políticas de senha.',
    recursoGlobal: 'Instância Keycloak compartilhada da plataforma',
    recursoTenant: 'Realm `<slug>` exclusivo desta conta',
    escopo: 'tenant',
    notaEscopo: 'O serviço de autenticação é compartilhado; os usuários desta conta vivem apenas no espaço isolado dela.',
  },
  {
    id: 'database', ordem: 2,
    nome: 'Banco de dados', subtitulo: 'Banco de dados do tenant',
    descricao: 'Cria a base de dados isolada do tenant e aplica as migrations iniciais.',
    recursoGlobal: 'Cluster PostgreSQL compartilhado da plataforma',
    recursoTenant: 'Database `tenant_<slug>` exclusiva desta conta',
    escopo: 'tenant',
    notaEscopo: 'O cluster é compartilhado, mas os dados desta conta ficam em uma database própria e isolada.',
  },
  {
    id: 'env-vars', ordem: 3,
    nome: 'Variáveis de ambiente', subtitulo: 'Segredos do tenant',
    descricao: 'Provisiona o projeto/ambiente de segredos e injeta as credenciais do tenant.',
    recursoGlobal: 'Instância Infisical compartilhada',
    recursoTenant: 'Ambiente `<slug>` com segredos exclusivos',
    escopo: 'tenant',
    notaEscopo: 'O cofre de segredos é compartilhado; os desta conta ficam em um ambiente separado e não são legíveis por outros tenants.',
  },
  {
    id: 'dns', ordem: 4,
    nome: 'DNS', subtitulo: 'Registro CNAME',
    descricao: 'Publica o CNAME do subdomínio do tenant apontando para o ingress da plataforma.',
    recursoGlobal: 'Zona DNS `pas.app.br` gerenciada no Cloudflare',
    recursoTenant: 'Registro CNAME `<slug>.<env>.pas.app.br`',
    escopo: 'global',
    notaEscopo: 'A zona DNS é um recurso global da plataforma. Este passo apenas adiciona um registro dentro dela.',
  },
  {
    id: 'ingress', ordem: 5,
    nome: 'Ingress com TLS', subtitulo: 'Certificado TLS do tenant',
    descricao: 'Aguarda ~60s de propagação do DNS e então cria o Ingress do tenant, emitindo o certificado TLS. Ao concluir, a URL do tenant resolve e a home abre — ainda sem soluções (isso é a Fase 2).',
    recursoGlobal: 'Ingress controller e cert-manager do cluster',
    recursoTenant: 'Ingress + Certificate do host do tenant',
    escopo: 'tenant',
    notaEscopo: 'O controller é compartilhado; o Ingress e o certificado são exclusivos deste host.',
  },
] as const

export const PROVISIONING_STEP_IDS: readonly ProvisioningStepId[] =
  PROVISIONING_STEPS.map(s => s.id)

/**
 * Catálogo alternativo usado por ContractDetailSheet ("Status da publicação").
 * NÃO é provisionamento de tenant — é o pipeline de publicação de um objeto
 * de contrato no marketplace. Mantido separado para não confundir os dois
 * domínios quando ProvisioningDots é reaproveitado.
 */
export const PUBLICACAO_STEPS: readonly ProvisioningStepDef[] = [
  {
    id: 'database', ordem: 1,
    nome: 'Submetido', subtitulo: 'Envio para revisão',
    descricao: 'A solução foi submetida para revisão de publicação.',
    recursoGlobal: '', recursoTenant: '', escopo: 'global', notaEscopo: '',
  },
  {
    id: 'keycloak', ordem: 2,
    nome: 'Em revisão', subtitulo: 'Análise da submissão',
    descricao: 'A submissão está em análise antes da publicação.',
    recursoGlobal: '', recursoTenant: '', escopo: 'global', notaEscopo: '',
  },
  {
    id: 'dns', ordem: 3,
    nome: 'Publicado', subtitulo: 'Disponível no marketplace',
    descricao: 'A solução está publicada e disponível no marketplace.',
    recursoGlobal: '', recursoTenant: '', escopo: 'global', notaEscopo: '',
  },
] as const

// ── Ações FGA (nomes de relação para a futura migração) ───────

/**
 * Nomes de relação OpenFGA. Manter em sincronia com o modelo quando ele for
 * escrito. Ponto único para grepar na migração.
 */
export const PROVISIONING_ACTIONS = {
  view: 'can_view_provisioning',
  reprovision: 'can_reprovision',
  viewLogs: 'can_view_provisioning_logs',
  healthCheck: 'can_run_health_check',
} as const

// ── Domínio do tenant ────────────────────────────────────────

/** Ambiente atual — VITE_PAS_ENV com fallback 'hml'. Nunca lança. */
export function getPasEnv(): string {
  return (import.meta.env.VITE_PAS_ENV as string | undefined)?.trim() || 'hml'
}

/**
 * Monta o domínio completo do tenant a partir do slug (= accounts.subdomain).
 * Retorna null quando não há slug — a UI deve mostrar estado "não configurado",
 * nunca uma URL quebrada como "https://..hml.pas.app.br".
 */
export function buildTenantDomain(
  slug: string | undefined | null,
  env: string = getPasEnv(),
): string | null {
  const s = slug?.trim()
  if (!s) return null
  return `https://${s}.${env}.pas.app.br`
}

// ── Derivações puras ──────────────────────────────────────────

export function deriveSummary(steps: ProvisioningStep[]): ProvisioningSummary {
  return {
    total: steps.length,
    concluidos: steps.filter(s => s.estado === 'criado').length,
    emAndamento: steps.filter(s => s.estado === 'em-andamento').length,
    pendentes: steps.filter(s => s.estado === 'pendente').length,
    comErro: steps.filter(s => s.estado === 'erro').length,
  }
}

export function deriveOverallStatus(steps: ProvisioningStep[]): ProvisioningOverallStatus {
  if (steps.some(s => s.estado === 'erro')) return 'FAILED'
  if (steps.every(s => s.estado === 'criado')) return 'COMPLETED'
  if (steps.some(s => s.estado === 'em-andamento' || s.estado === 'criado')) return 'IN_PROGRESS'
  return 'PENDING'
}

/**
 * Deriva estados sintéticos de step a partir de apenas o status consolidado.
 * Usado por ProvisioningDots quando a prop `steps` não é passada (ex: a
 * tabela de contas da org, que só tem `account.provisioningStatus`).
 */
export function deriveStepsFromStatus(status: ProvisioningOverallStatus): ProvisioningStep[] {
  const base = (estado: ProvisioningStepState): ProvisioningStep[] =>
    PROVISIONING_STEPS.map(def => ({
      id: def.id,
      estado,
      iniciadoEm: null,
      concluidoEm: null,
      duracaoMs: null,
      erro: null,
    }))

  if (status === 'COMPLETED') return base('criado')
  if (status === 'PENDING') return base('pendente')

  if (status === 'IN_PROGRESS') {
    // metade concluída, o passo seguinte em andamento, o resto pendente
    const meio = Math.floor(PROVISIONING_STEPS.length / 2)
    return PROVISIONING_STEPS.map((def, i) => ({
      id: def.id,
      estado: i < meio ? 'criado' : i === meio ? 'em-andamento' : 'pendente',
      iniciadoEm: null,
      concluidoEm: null,
      duracaoMs: null,
      erro: null,
    }))
  }

  // FAILED: primeiro passo criado, segundo em erro, resto pendente —
  // sintético, apenas para dar sinal visual quando não há snapshot real.
  return PROVISIONING_STEPS.map((def, i) => ({
    id: def.id,
    estado: i === 0 ? 'criado' : i === 1 ? 'erro' : 'pendente',
    iniciadoEm: null,
    concluidoEm: null,
    duracaoMs: null,
    erro: i === 1 ? {
      codigo: 'DESCONHECIDO',
      mensagem: 'Falha no provisionamento. Veja os detalhes na tela de provisionamento.',
      ocorridoEm: new Date().toISOString(),
      tentativas: 1,
      podeReexecutar: true,
    } : null,
  }))
}

/**
 * Deriva o status consolidado da Fase 2 a partir do status da Fase 1 e das
 * soluções em provisionamento. Regra confirmada com o arquiteto do worker:
 * a Fase 2 não pode nem começar se a Fase 1 não estiver concluída.
 */
export function deriveFase2Status(
  fase1Status: ProvisioningOverallStatus,
  solucoes: SolutionProvisioning[],
): Fase2Status {
  if (fase1Status !== 'COMPLETED') return 'bloqueada'
  if (solucoes.length === 0) return 'sem-contrato'
  if (solucoes.some(s => s.estado === 'erro')) return 'FAILED'
  if (solucoes.every(s => s.estado === 'criado')) return 'COMPLETED'
  if (solucoes.some(s => s.estado === 'em-andamento' || s.estado === 'criado')) return 'IN_PROGRESS'
  return 'PENDING'
}

// ── Join contratos/soluções (frágil por design — ver nota) ────

/**
 * Contratos e soluções não têm FK para account: o vínculo é resolvido por
 * correspondência exata de string entre `contracts.contratante` e
 * `account.name`. Isolado aqui para que uma futura correção (FK real)
 * altere um único lugar. Ver Risco 2 do plano PAS-2409.
 */
export function resolveAccountContracts<
  C extends { contratante: string; status: string },
>(accountName: string, contracts: C[]): C[] {
  return contracts.filter(c => c.contratante === accountName && c.status !== 'Inativo')
}

export function resolveAccountSolutionNames<
  C extends { objetos: { solucao: string }[] },
>(linkedContracts: C[]): Set<string> {
  return new Set(linkedContracts.flatMap(c => c.objetos.map(o => o.solucao)))
}

// ── Swap point ────────────────────────────────────────────────

/** true = usa mock local. Trocar para false quando o worker expuser o endpoint. */
const USE_MOCK_PROVISIONING = true

const MOCK_LATENCY_MS = 350

function delay<T>(value: T, ms: number = MOCK_LATENCY_MS): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}

/**
 * Ponto de tradução entre o payload cru do worker e o contrato interno.
 * No modo mock é identidade — mas existe desde o início para que, quando o
 * worker real expuser um shape diferente, só esta função precise mudar.
 */
function adaptWorkerSnapshot(raw: ProvisioningSnapshot): ProvisioningSnapshot {
  return {
    ...raw,
    // Ordem e presença dos steps sempre vêm do catálogo do front, nunca do
    // worker — um worker que omita um passo ou mande fora de ordem não
    // quebra a tela.
    steps: PROVISIONING_STEPS.map(def => {
      const found = raw.steps.find(s => s.id === def.id)
      return found ?? {
        id: def.id,
        estado: 'pendente' as const,
        iniciadoEm: null,
        concluidoEm: null,
        duracaoMs: null,
        erro: null,
      }
    }),
  }
}

export class ProvisioningNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Nenhum registro de provisionamento encontrado para a conta ${accountId}.`)
    this.name = 'ProvisioningNotFoundError'
  }
}

export async function getProvisioning(accountId: string): Promise<ProvisioningSnapshot> {
  if (USE_MOCK_PROVISIONING) {
    const raw = provisioningSnapshots[accountId]
    if (!raw) throw new ProvisioningNotFoundError(accountId)
    return delay(adaptWorkerSnapshot(raw))
  }
  throw new Error('Backend de provisionamento ainda não implementado.')
}

export async function runHealthCheck(accountId: string): Promise<HealthCheckResult> {
  if (USE_MOCK_PROVISIONING) {
    const raw = provisioningHealth[accountId]
    if (!raw) throw new ProvisioningNotFoundError(accountId)
    return delay(raw, 900)
  }
  throw new Error('Backend de provisionamento ainda não implementado.')
}

export async function getProvisioningLogs(accountId: string): Promise<ProvisioningLogPage> {
  if (USE_MOCK_PROVISIONING) {
    const raw = provisioningLogs[accountId]
    if (!raw) return delay({ accountId, entradas: [], temMais: false, proximoCursor: null })
    return delay(raw, 500)
  }
  throw new Error('Backend de provisionamento ainda não implementado.')
}

export async function reprovisionTenant(accountId: string): Promise<ReprovisionResult> {
  if (USE_MOCK_PROVISIONING) {
    return delay({
      accountId,
      aceito: true,
      correlationId: `prv_mock_${Date.now()}`,
      mensagem: 'Reprovisionamento aceito pelo worker (mock). Acompanhe o status nesta tela.',
    }, 600)
  }
  throw new Error('Backend de provisionamento ainda não implementado.')
}
