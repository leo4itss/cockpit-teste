/**
 * Contrato de provisionamento de tenant.
 *
 * Este arquivo é o contrato com o pas-cockpit-worker. Enquanto o worker real
 * não expõe endpoint, `src/services/provisioning.ts` devolve mocks com
 * exatamente este shape. Ao plugar o backend, o shape aqui não deve mudar —
 * apenas o swap point no serviço.
 *
 * Sem `enum`: tsconfig.app.json usa `erasableSyntaxOnly`.
 */

// ── Steps ─────────────────────────────────────────────────────

/** Os 5 passos reais executados pelo worker de provisionamento. */
export type ProvisioningStepId =
  | 'database'   // PostgreSQL do tenant
  | 'keycloak'   // realm e configurações
  | 'dns'        // registro CNAME no Cloudflare
  | 'ingress'    // Ingress com TLS (cert-manager + Let's Encrypt)
  | 'env-vars'   // Variáveis de ambiente (Infisical)

/** Estado de um passo individual. Rótulos pt-BR vivem no catálogo do serviço. */
export type ProvisioningStepState =
  | 'criado'       // concluído com sucesso — o recurso existe
  | 'pendente'     // ainda não iniciado
  | 'em-andamento' // executando agora
  | 'erro'         // falhou; `erro` é obrigatório neste estado

/**
 * Distingue recurso GLOBAL da plataforma de recurso POR TENANT.
 * - 'global' → o serviço é compartilhado; o passo cria um escopo isolado dentro dele.
 * - 'tenant' → o recurso em si é exclusivo deste tenant.
 * A UI não pode dar a entender que dados do tenant vivem num recurso global.
 */
export type ProvisioningResourceScope = 'global' | 'tenant'

/**
 * Metadados estáticos de um passo — não vêm do worker, vivem no catálogo do front.
 *
 * Regra de escrita (handoff 19/08/2026): `descricao` narra o RECURSO QUE É
 * CRIADO, nunca a capacidade que o cliente ganha. Nenhuma etapa isolada pode
 * sugerir que o cliente já consegue entrar, acessar ou usar a plataforma — o
 * acesso só existe com a Fase 1 inteira concluída, e o uso efetivo depende da
 * Fase 2. Nomes de fornecedor ficam restritos a `recursoGlobal`/`recursoTenant`,
 * que só aparecem no painel expandido da etapa.
 */
export interface ProvisioningStepDef {
  id: ProvisioningStepId
  ordem: number
  nome: string
  /** Legado — não é mais renderizado na timeline; `descricao` ocupou seu lugar. */
  subtitulo: string
  descricao: string
  /** Consequência funcional da falha desta etapa. Renderizado abaixo da descrição. */
  impactoFalha: string
  recursoGlobal: string
  recursoTenant: string
  escopo: ProvisioningResourceScope
  notaEscopo: string
}

/** Detalhe de falha. Obrigatório quando `estado === 'erro'`. */
export interface ProvisioningStepError {
  codigo: string
  mensagem: string
  detalhe?: string
  ocorridoEm: string       // ISO 8601
  tentativas: number
  podeReexecutar: boolean
  docUrl?: string
}

/** Estado runtime de um passo, vindo do worker. */
export interface ProvisioningStep {
  id: ProvisioningStepId
  estado: ProvisioningStepState
  iniciadoEm: string | null
  concluidoEm: string | null
  duracaoMs: number | null
  detalhes?: Record<string, string>
  erro?: ProvisioningStepError | null
}

// ── Status consolidado ────────────────────────────────────────

/** Reutiliza o union de `Account['provisioningStatus']`. */
export type ProvisioningOverallStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'

/** Contagens derivadas — nunca persistidas, sempre calculadas de `steps`. */
export interface ProvisioningSummary {
  total: number
  concluidos: number
  emAndamento: number
  pendentes: number
  comErro: number
}

// ── Tenant ────────────────────────────────────────────────────

export interface TenantInfo {
  accountId: string
  accountName: string
  /** Slug do tenant = `accounts.subdomain`. Não renomear a coluna. */
  slug: string
  /** Domínio completo montado por buildTenantDomain(). null quando slug vazio. */
  dominio: string | null
  ambiente: string
  orgId: string
  orgNome: string
  criadoEm: string
}

// ── Fase 2 — provisionamento por solução, disparado pelo contrato ──
//
// A Fase 1 (acima) é o workflow `tenantProvisioning`: roda na criação da
// conta, cria banco/realm/secrets/DNS/ingress. A Fase 2 é um workflow
// SEPARADO (`solutionPublicationByContract`): roda quando um contrato é
// criado, provisiona cada solução coberta pelo contrato e libera acesso.
// Não mexe em DNS/Ingress. Exige Fase 1 concluída (regra confirmada com o
// arquiteto do worker).

/** Estado de provisionamento de UMA solução na Fase 2. Reusa os 4 estados da Fase 1. */
export interface SolutionProvisioning {
  /** = Solution.name — mesmo join por string já usado no resto do app. */
  solucaoNome: string
  /**
   * Contrato que disparou o provisionamento desta solução. Opcional porque os
   * fixtures anteriores ao handoff de 19/08/2026 não têm o vínculo. Quando
   * ausente, a solução aparece na tela do tenant mas não é atribuível a um
   * contrato específico.
   */
  contratoId?: string
  estado: ProvisioningStepState
  iniciadoEm: string | null
  concluidoEm: string | null
  duracaoMs: number | null
  detalhes?: Record<string, string>
  erro?: ProvisioningStepError | null
}

/**
 * 'bloqueada'    → Fase 1 não concluída; Fase 2 nem pode começar.
 * 'sem-contrato' → Fase 1 OK, mas nenhum contrato ativo cobre este tenant ainda.
 * ProvisioningOverallStatus → há contrato; status derivado de `solucoes[]`.
 */
export type Fase2Status = 'bloqueada' | 'sem-contrato' | ProvisioningOverallStatus

// ── Snapshot completo ─────────────────────────────────────────

export interface ProvisioningSnapshot {
  tenant: TenantInfo
  /** Fase 1 — status consolidado. */
  status: ProvisioningOverallStatus
  /** Fase 1 — sempre os 5 steps, sempre em ordem. */
  steps: ProvisioningStep[]
  iniciadoEm: string | null
  finalizadoEm: string | null
  workerVersion: string | null
  correlationId: string | null
  atualizadoEm: string
  /** Fase 2 — uma entrada por solução coberta pelo contrato ativo. Vazio = sem contrato ainda. */
  solucoes: SolutionProvisioning[]
}

// ── Health check sob demanda ──────────────────────────────────

export type HealthCheckState = 'ok' | 'degradado' | 'falha' | 'nao-verificado'

export interface HealthCheckItem {
  id: ProvisioningStepId
  estado: HealthCheckState
  latenciaMs: number | null
  mensagem: string
}

export interface HealthCheckResult {
  accountId: string
  executadoEm: string
  duracaoMs: number
  estadoGeral: HealthCheckState
  itens: HealthCheckItem[]
}

// ── Logs ──────────────────────────────────────────────────────

export type ProvisioningLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ProvisioningLogEntry {
  id: string
  timestamp: string
  nivel: ProvisioningLogLevel
  /** null = log do orquestrador, não de um passo específico. */
  stepId: ProvisioningStepId | null
  mensagem: string
  contexto?: Record<string, string | number | boolean | null>
}

export interface ProvisioningLogPage {
  accountId: string
  entradas: ProvisioningLogEntry[]
  temMais: boolean
  proximoCursor: string | null
}

// ── Ação: reprovisionar ───────────────────────────────────────

export interface ReprovisionResult {
  accountId: string
  /** true = worker aceitou o job. Não significa que já terminou. */
  aceito: boolean
  correlationId: string
  mensagem: string
}

// ── Máquina de estados da tela ────────────────────────────────

/** Discriminated union — força tratar os 4 casos (loading/ok/vazio/erro). */
export type ProvisioningFetchState =
  | { fase: 'carregando' }
  | { fase: 'ok'; dados: ProvisioningSnapshot }
  | { fase: 'vazio'; motivo: string }
  | { fase: 'erro'; mensagem: string; podeTentarNovamente: boolean }
