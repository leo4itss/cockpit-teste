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
  ContractStatus,
} from '@/types'
import {
  provisioningSnapshots,
  provisioningHealth,
  provisioningLogs,
} from '@/data/mock'
// Simulação temporal da Fase 2 — descartável, some quando o worker real entrar.
import {
  registrarExecucaoFase2,
  solucoesDoContrato,
  solucoesDaConta,
} from './fase2Mock'

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
    descricao: 'Cria o espaço de identidade exclusivo da conta, onde os usuários do cliente serão posteriormente cadastrados.',
    impactoFalha: 'Sem esse espaço, não há onde cadastrar nem autenticar os usuários do cliente.',
    recursoGlobal: 'Instância Keycloak compartilhada da plataforma',
    recursoTenant: 'Realm `<slug>` exclusivo desta conta',
    escopo: 'tenant',
    notaEscopo: 'O serviço de autenticação é compartilhado; os usuários desta conta vivem apenas no espaço isolado dela.',
  },
  {
    id: 'database', ordem: 2,
    nome: 'Banco de dados', subtitulo: 'Banco de dados do tenant',
    descricao: 'Cria o armazenamento isolado da conta. As estruturas de dados de cada solução são criadas depois, no provisionamento por contrato.',
    impactoFalha: 'Não há onde gravar os dados do cliente.',
    recursoGlobal: 'Cluster PostgreSQL compartilhado da plataforma',
    recursoTenant: 'Database `tenant_<slug>` exclusiva desta conta',
    escopo: 'tenant',
    notaEscopo: 'O cluster é compartilhado, mas os dados desta conta ficam em uma database própria e isolada.',
  },
  {
    id: 'env-vars', ordem: 3,
    nome: 'Variáveis de ambiente', subtitulo: 'Segredos do tenant',
    descricao: 'Registra com segurança as configurações e credenciais de acesso específicas desta conta.',
    impactoFalha: 'As soluções não conseguirão se conectar aos serviços de que dependem.',
    recursoGlobal: 'Instância Infisical compartilhada',
    recursoTenant: 'Ambiente `<slug>` com segredos exclusivos',
    escopo: 'tenant',
    notaEscopo: 'O cofre de segredos é compartilhado; os desta conta ficam em um ambiente separado e não são legíveis por outros tenants.',
  },
  {
    id: 'dns', ordem: 4,
    nome: 'DNS', subtitulo: 'Registro CNAME',
    descricao: 'Registra o endereço de internet da conta na zona de endereços da plataforma.',
    impactoFalha: 'O endereço não existe e o navegador não localiza o site.',
    recursoGlobal: 'Zona DNS `pas.app.br` gerenciada no Cloudflare',
    recursoTenant: 'Registro CNAME `<slug>.<env>.pas.app.br`',
    escopo: 'global',
    notaEscopo: 'A zona DNS é um recurso global da plataforma. Este passo apenas adiciona um registro dentro dela.',
  },
  {
    id: 'ingress', ordem: 5,
    nome: 'Ingress com TLS', subtitulo: 'Certificado TLS do tenant',
    descricao: 'Publica esse endereço com conexão criptografada.',
    impactoFalha: 'O endereço existe, mas não abre corretamente ou acusa problema de segurança.',
    recursoGlobal: 'Ingress controller e cert-manager do cluster',
    recursoTenant: 'Ingress + Certificate do host do tenant',
    escopo: 'tenant',
    notaEscopo: 'O controller é compartilhado; o Ingress e o certificado são exclusivos deste host.',
  },
] as const

/**
 * Nota de fechamento do bloco da Fase 1. Existe para desfazer a leitura de que
 * concluir a Fase 1 já entrega as soluções ao cliente — o problema central
 * levantado no handoff de 19/08/2026.
 */
export const FASE1_NOTA_GERAL =
  'A conclusão do provisionamento da conta prepara a infraestrutura e o endereço de acesso. ' +
  'As soluções que o cliente contratou são disponibilizadas no provisionamento por contrato.'

export const PROVISIONING_STEP_IDS: readonly ProvisioningStepId[] =
  PROVISIONING_STEPS.map(s => s.id)

// ── Vocabulário de status ────────────────────────────────────
//
// Fonte única. Havia quatro cópias divergentes deste mapa (ProvisionamentoPage,
// NewContractSheet, EditContractSheet, ProvisioningDots) e a mesma situação
// aparecia com três palavras diferentes na mesma tela: "Falhou", "Erro" e
// "Com erro". Editar um mapa e esquecer os outros era questão de tempo.
//
// Regra de escrita: a falha é sempre **"Falha"**, substantivo. A única exceção
// é `ContractStatus`, onde o rótulo é "Falha no provisionamento" — ali a
// palavra precisa dizer *o que* falhou, já que o contrato em si não falhou.

export type ProvisioningBadgeVariant = 'success' | 'info' | 'default' | 'error'

/** Status consolidado de uma fase (badge + rótulo). */
export const PROVISIONING_STATUS_BADGE: Record<
  ProvisioningOverallStatus,
  { variant: ProvisioningBadgeVariant; label: string }
> = {
  COMPLETED:   { variant: 'success', label: 'Concluído' },
  IN_PROGRESS: { variant: 'info',    label: 'Em andamento' },
  PENDING:     { variant: 'default', label: 'Pendente' },
  FAILED:      { variant: 'error',   label: 'Falha' },
}

/** Estado de UMA etapa da Fase 1 ou de UMA solução da Fase 2. */
export const PROVISIONING_STEP_LABEL: Record<ProvisioningStepState, string> = {
  criado: 'Criado',
  pendente: 'Pendente',
  'em-andamento': 'Em andamento',
  erro: 'Falha',
}

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
    impactoFalha: '',
    recursoGlobal: '', recursoTenant: '', escopo: 'global', notaEscopo: '',
  },
  {
    id: 'keycloak', ordem: 2,
    nome: 'Em revisão', subtitulo: 'Análise da submissão',
    descricao: 'A submissão está em análise antes da publicação.',
    impactoFalha: '',
    recursoGlobal: '', recursoTenant: '', escopo: 'global', notaEscopo: '',
  },
  {
    id: 'dns', ordem: 3,
    nome: 'Publicado', subtitulo: 'Disponível no marketplace',
    descricao: 'A solução está publicada e disponível no marketplace.',
    impactoFalha: '',
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

/**
 * Deriva o status do contrato a partir do provisionamento das suas soluções.
 *
 * Regra do handoff 19/08/2026: **'Ativo' só pode ser exibido quando o
 * provisionamento concluir integralmente**. Antes disso o contrato está
 * 'Provisionando'; se qualquer solução falhar, 'Falha no provisionamento'.
 *
 * `statusAtual` é respeitado quando o contrato já saiu do ciclo de
 * provisionamento — um contrato inativado não volta a "provisionando" só
 * porque a lista de soluções está vazia.
 */
export function deriveContractStatus(
  solucoes: SolutionProvisioning[],
  statusAtual: ContractStatus,
): ContractStatus {
  if (statusAtual === 'Inativo') return 'Inativo'
  // Sem nenhuma solução rastreada não há o que derivar — preserva o que já existe.
  if (solucoes.length === 0) return statusAtual
  if (solucoes.some(s => s.estado === 'erro')) return 'Falha no provisionamento'
  if (solucoes.every(s => s.estado === 'criado')) return 'Ativo'
  return 'Provisionando'
}

/** Estados em que a Fase 2 do contrato ainda está rodando — usado para parar o polling. */
export function isContractStatusTerminal(status: ContractStatus): boolean {
  return status !== 'Provisionando'
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
    const snapshot = adaptWorkerSnapshot(raw)
    // Contratos criados durante a sessão têm Fase 2 simulada em tempo real —
    // elas se somam às soluções que já vinham do fixture.
    const simuladas = solucoesDaConta(accountId)
    return delay(
      simuladas.length > 0
        ? { ...snapshot, solucoes: [...snapshot.solucoes, ...simuladas] }
        : snapshot,
    )
  }
  throw new Error('Backend de provisionamento ainda não implementado.')
}

/**
 * Fase 2 de UM contrato — uma entrada por solução coberta.
 *
 * Swap point: quando o worker expuser status por contrato, trocar o corpo do
 * `if` por uma chamada HTTP. O shape de retorno não muda.
 */
export async function getContractProvisioning(contratoId: string): Promise<SolutionProvisioning[]> {
  if (USE_MOCK_PROVISIONING) {
    return delay(solucoesDoContrato(contratoId), 200)
  }
  throw new Error('Backend de provisionamento ainda não implementado.')
}

/**
 * Dispara a Fase 2 para um contrato. Chamado logo após a criação/alteração do
 * contrato — é o equivalente ao worker iniciar o workflow
 * `solutionPublicationByContract`.
 */
export function startContractProvisioning(
  contratoId: string,
  accountId: string,
  solucoes: string[],
): void {
  if (USE_MOCK_PROVISIONING) {
    registrarExecucaoFase2(contratoId, accountId, solucoes)
    return
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
      // Texto exibido ao usuário — não citar "mock"/"worker" aqui.
      mensagem: 'Reprovisionamento solicitado.\nAcompanhe o status nesta tela.',
    }, 600)
  }
  throw new Error('Backend de provisionamento ainda não implementado.')
}
