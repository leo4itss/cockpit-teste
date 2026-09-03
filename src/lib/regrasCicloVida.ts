/**
 * Regras de ciclo de vida — inativação, reativação e exclusão física das quatro
 * entidades da hierarquia Organização → Conta → Solução → Contrato.
 *
 * Fonte: reunião "Definições em aberto do UH de Contratos" — 03/09/2026
 * (Neide, River, Leonardo, Pedro Vitor, Mateus Gandi).
 *
 * Ponto único, funções puras — mesmo padrão de `src/authz/engine.ts`. Os
 * componentes só ligam os vereditos à UI; não recalculam vínculo.
 *
 * ── Modelo (uniforme para as quatro entidades — condição do River) ──
 *
 * INATIVAÇÃO — bottom-up. Uma entidade só inativa quando não há nenhum filho
 *   ATIVO (`status !== 'Inativo'`) no nível de baixo. O bloqueio exibe a lista
 *   dos filhos; o usuário inativa item a item e volta. Nunca cascateia. Não há
 *   diálogo de confirmação forte nem "palavra de segurança".
 *
 * REATIVAÇÃO — sempre manual, item a item. Nunca cascateia: antes da inativação
 *   o conjunto podia ter itens ativos e inativos misturados, e reativar em bloco
 *   destruiria esse estado. (Aplicada nos handlers `handleActivate*` das páginas.)
 *
 * EXCLUSÃO FÍSICA — hard delete, mecanismo de correção de erro operacional.
 *   Privilégio exclusivo de `platform_admin`. Também bottom-up. Exige as TRÊS
 *   condições simultâneas:
 *     1. jaTeveContrato === false  — nunca teve contrato, nem já finalizado
 *     2. zero itens vinculados     — filhos diretos, de qualquer status
 *     3. status !== 'Inativo'      — se foi inativada, esteve em uso, e "em uso"
 *                                    não é caso de correção de erro
 *   Contrato NUNCA é excluível fisicamente, em perfil nenhum.
 *
 * ── "Contrato válido" tem três leituras que NÃO se misturam ──
 *   contratoAtivo(c)     → status !== 'Inativo'.  Bloqueia inativação do pai.
 *   jaTeveContrato(...)  → qualquer contrato na história (qualquer status).
 *                          Bloqueia a exclusão física, permanentemente.
 *   dataTermino          → sem efeito nenhum em ciclo de vida. Contrato vencido
 *                          por data permanece "válido" enquanto o status não for
 *                          'Inativo' (Marcelo: preservar para negociação; churn
 *                          é quando o cliente sai e o contrato é inativado).
 */

import type { Account, Contract, Organization, Solution } from '@/types'

export type NivelHierarquia = 'organizacao' | 'conta' | 'solucao' | 'contrato'
export type TipoImpedimento = 'conta' | 'solucao' | 'contrato'

export interface Impedimento {
  tipo: TipoImpedimento
  id: string
  nome: string
  detalhe?: string
}

export type MotivoBloqueio =
  | 'filhos-ativos'     // inativação: há filhos com status !== 'Inativo'
  | 'itens-vinculados'  // exclusão: há filhos (qualquer status) — resolver primeiro
  | 'ja-teve-contrato'  // exclusão: histórico de contrato — indisponível para sempre
  | 'ja-inativada'      // exclusão: entidade inativa nunca mais é excluível
  | 'ja-usada'          // exclusão: HIPÓTESE 1 — critério indefinido
  | 'sem-permissao'     // exclusão: perfil != platform_admin
  | 'nao-aplicavel'     // contrato nunca é excluível

export interface Veredito {
  permitido: boolean
  motivo?: MotivoBloqueio
  /** Registros a exibir. Navegáveis apenas quando `motivo` é resolúvel pelo usuário. */
  impedimentos: Impedimento[]
}

const OK: Veredito = { permitido: true, impedimentos: [] }

/** 'Criado' e 'Ativo' contam como ativo; só 'Inativo' não. */
const ativo = (status: string) => status !== 'Inativo'

// ── Contexto de vínculos ─────────────────────────────────────
// As páginas montam a partir do que já têm carregado.

export interface ContextoVinculos {
  contas: Account[]
  solucoes: Solution[]
  contratos: Contract[]
}

export interface ContextoPerfil {
  isPlatformAdmin: boolean
}

// ── Consultas (exportadas p/ a UI decidir rótulos de botão) ──

/** Contrato "prende" enquanto o status não for 'Inativo'. Data de término não importa. */
export const contratoAtivo = (c: Contract) => c.status !== 'Inativo'

export function contratosDaConta(conta: Account, ctx: ContextoVinculos): Contract[] {
  // Sem FK: contracts.contratante = accounts.name, escopado por org (nomes não são únicos).
  return ctx.contratos.filter(c => c.orgId === conta.orgId && c.contratante === conta.name)
}

export function contratosDaSolucao(sol: Solution, ctx: ContextoVinculos): Contract[] {
  return ctx.contratos.filter(c => c.objetos.some(o => o.solucao === sol.name))
}

export function contratosDaOrg(org: Organization, ctx: ContextoVinculos): Contract[] {
  return ctx.contratos.filter(c => c.orgId === org.id)
}

/** Vínculo direto solução↔conta (Solution.accountId). */
export function solucoesDaConta(conta: Account, ctx: ContextoVinculos): Solution[] {
  return ctx.solucoes.filter(s => s.accountId === conta.id)
}

export function contasDaOrg(org: Organization, ctx: ContextoVinculos): Account[] {
  return ctx.contas.filter(a => a.orgId === org.id)
}

// ── Builders de Impedimento ──────────────────────────────────

const impContrato = (c: Contract): Impedimento => ({
  tipo: 'contrato', id: c.id, nome: `Contrato · ${c.contratante}`,
  detalhe: c.status === 'Inativo' ? 'inativo' : 'ativo',
})
const impConta = (a: Account): Impedimento => ({
  tipo: 'conta', id: a.id, nome: a.name,
  detalhe: a.status === 'Inativo' ? 'inativa' : 'ativa',
})
const impSolucao = (s: Solution): Impedimento => ({
  tipo: 'solucao', id: s.id, nome: s.name,
  detalhe: s.status === 'Inativo' ? 'inativa' : 'ativa',
})

// ── INATIVAÇÃO ───────────────────────────────────────────────

function vereditoInativacao(filhosAtivos: Impedimento[]): Veredito {
  return filhosAtivos.length === 0
    ? OK
    : { permitido: false, motivo: 'filhos-ativos', impedimentos: filhosAtivos }
}

/** Contrato é o único nível inativável diretamente, sem pré-requisito. */
export function podeInativarContrato(): Veredito {
  return OK
}

/** Solução: bloqueada por contrato ativo que a referencia. */
export function podeInativarSolucao(sol: Solution, ctx: ContextoVinculos): Veredito {
  return vereditoInativacao(contratosDaSolucao(sol, ctx).filter(contratoAtivo).map(impContrato))
}

/** Conta: bloqueada por contrato ativo vinculado (por nome). */
export function podeInativarConta(conta: Account, ctx: ContextoVinculos): Veredito {
  return vereditoInativacao(contratosDaConta(conta, ctx).filter(contratoAtivo).map(impContrato))
}

/** Organização: bloqueada por conta com status !== 'Inativo'. */
export function podeInativarOrganizacao(org: Organization, ctx: ContextoVinculos): Veredito {
  return vereditoInativacao(
    contasDaOrg(org, ctx).filter(a => ativo(a.status)).map(impConta),
  )
}

// ── EXCLUSÃO FÍSICA ──────────────────────────────────────────

// HIPÓTESE 1 — critério de "entidade nunca usada" não definido na reunião de
// 03/09/2026. River sinalizou que pode ser necessário um histórico/log de uso
// ainda inexistente; Pedro Vitor mencionou tabelas criadas no primeiro acesso à
// home, River considerou insuficiente. Sem esse dado a Regra 4 não é totalmente
// implementável.
// Implementação provisória: assume "nunca usada" toda entidade — o único gate
// efetivo hoje é "nunca teve contrato". Pendente de validação com River antes de
// ir para produção.
// Assinatura futura: entidadeJaUsada(nivel, id). Enquanto o log de uso não
// existir, ignora os argumentos e assume que nada foi usado.
function entidadeJaUsada(): boolean {
  return false
}

/**
 * Núcleo uniforme (Regra 10). A única variação por entidade são os dois últimos
 * argumentos: `historicoContratos` (todos os contratos que a entidade teve, de
 * qualquer status) e `itensVinculados` (os filhos diretos, de qualquer status).
 */
function decideExclusaoFisica(
  entidade: { id: string; status: string },
  historicoContratos: Contract[],
  itensVinculados: Impedimento[],
  perfil: ContextoPerfil,
): Veredito {
  if (!perfil.isPlatformAdmin) {
    return { permitido: false, motivo: 'sem-permissao', impedimentos: [] }
  }
  if (!ativo(entidade.status)) {
    return { permitido: false, motivo: 'ja-inativada', impedimentos: [] }
  }
  if (historicoContratos.length > 0) {
    // Contratos são imortais (Regra 3) — nada a resolver, exclusão indisponível para sempre.
    return { permitido: false, motivo: 'ja-teve-contrato', impedimentos: historicoContratos.map(impContrato) }
  }
  if (itensVinculados.length > 0) {
    return { permitido: false, motivo: 'itens-vinculados', impedimentos: itensVinculados }
  }
  if (entidadeJaUsada()) {
    return { permitido: false, motivo: 'ja-usada', impedimentos: [] }
  }
  return OK
}

/** Contrato NUNCA é excluível fisicamente — registro jurídico e fiscal. */
export function podeExcluirContrato(): Veredito {
  return { permitido: false, motivo: 'nao-aplicavel', impedimentos: [] }
}

/** Solução: filhos = contratos que a referenciam (histórico e vínculo são o mesmo conjunto). */
export function podeExcluirSolucao(sol: Solution, ctx: ContextoVinculos, perfil: ContextoPerfil): Veredito {
  const contratos = contratosDaSolucao(sol, ctx)
  return decideExclusaoFisica(sol, contratos, contratos.map(impContrato), perfil)
}

/** Conta: histórico = contratos por nome; filhos = soluções com accountId. */
export function podeExcluirConta(conta: Account, ctx: ContextoVinculos, perfil: ContextoPerfil): Veredito {
  return decideExclusaoFisica(
    conta,
    contratosDaConta(conta, ctx),
    solucoesDaConta(conta, ctx).map(impSolucao),
    perfil,
  )
}

/** Organização: histórico = contratos da org; filhos = contas da org (qualquer status). */
export function podeExcluirOrganizacao(org: Organization, ctx: ContextoVinculos, perfil: ContextoPerfil): Veredito {
  return decideExclusaoFisica(
    org,
    contratosDaOrg(org, ctx),
    contasDaOrg(org, ctx).map(impConta),
    perfil,
  )
}

// ── Copy dos vereditos de bloqueio (fonte única) ─────────────

/** Título + descrição do modal bloqueado, por motivo. `nome` é o da entidade-alvo. */
export function textoBloqueio(
  nivel: Exclude<NivelHierarquia, 'contrato'>,
  motivo: MotivoBloqueio,
): { titulo: string; descricao: string; verbo: 'inativar' | 'excluir' } {
  const N = { organizacao: 'organização', conta: 'conta', solucao: 'solução' }[nivel]
  switch (motivo) {
    case 'filhos-ativos': {
      const filho = nivel === 'organizacao' ? 'contas ativas' : 'contratos ativos'
      return {
        titulo: `Não é possível inativar esta ${N}`,
        descricao: `Não é possível inativar esta ${N}. Existem ${filho} vinculados. Inative primeiro os itens abaixo:`,
        verbo: 'inativar',
      }
    }
    case 'itens-vinculados': {
      const filho = nivel === 'organizacao' ? 'contas' : 'soluções'
      return {
        titulo: `Não é possível excluir esta ${N}`,
        descricao: `A exclusão física exige que não haja nenhum item vinculado. Exclua primeiro as ${filho} abaixo:`,
        verbo: 'excluir',
      }
    }
    case 'ja-teve-contrato':
      return {
        titulo: `Não é possível excluir esta ${N}`,
        descricao: `Esta ${N} já teve contrato vinculado. A exclusão física fica permanentemente indisponível — a única ação possível é a inativação.`,
        verbo: 'excluir',
      }
    case 'ja-inativada':
      return {
        titulo: `Não é possível excluir esta ${N}`,
        descricao: `Uma ${N} inativa não pode ser excluída fisicamente. A exclusão física é um mecanismo de correção de erro e só se aplica a registros ativos que nunca foram usados.`,
        verbo: 'excluir',
      }
    case 'ja-usada':
      return {
        titulo: `Não é possível excluir esta ${N}`,
        descricao: `Esta ${N} já foi utilizada e não pode ser excluída fisicamente. A única ação possível é a inativação.`,
        verbo: 'excluir',
      }
    default:
      return {
        titulo: `Não é possível excluir esta ${N}`,
        descricao: `A exclusão física não está disponível.`,
        verbo: 'excluir',
      }
  }
}
