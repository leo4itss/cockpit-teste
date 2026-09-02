/**
 * Regras de inativação e exclusão de Organização, Conta, Solução e Contrato.
 *
 * Ponto único — nenhum componente calcula vínculo por conta própria. Mesma
 * ideia de `src/authz/engine.ts`: funções puras, sem React, sem side effects.
 *
 * Modelo: **pré-requisito de baixo para cima**, nunca cascata. Um nível só é
 * inativado ou excluído quando os níveis dependentes já foram resolvidos.
 * Nenhuma ação altera o status de registros dependentes.
 *
 * Hierarquia dos vínculos (joins por nome onde não há FK — ver CLAUDE.md):
 *   Organização ──orgId──> Conta ──(contratante = conta.name)──> Contrato
 *   Contrato.objetos[].solucao ──(= solucao.name)──> Solução
 *   Solução ──accountId──> Conta        (vínculo direto de catálogo por conta)
 *   Solução ──componenteIds[]──> Componente
 *   Conta ──user_account_memberships──> Usuário
 */

import type { Account, Contract, Organization, Solution, User } from '@/types'
import { parsearData } from '@/lib/datas'

export type TipoImpedimento = 'conta' | 'contrato' | 'solucao' | 'componente' | 'usuario'

export interface Impedimento {
  tipo: TipoImpedimento
  id: string
  nome: string
  /** Texto curto de contexto — ex.: "vigente até 31/12/2026", "em quarentena". */
  detalhe?: string
}

export interface Veredito {
  permitido: boolean
  /**
   * 'vinculos'       → há registros dependentes a resolver (lista em `impedimentos`).
   * 'registro-ativo' → HIPÓTESE 4: exclusão exige que o registro esteja inativo.
   * 'nunca'          → ação não existe para esta entidade (contrato não é excluível).
   */
  motivo?: 'vinculos' | 'registro-ativo' | 'nunca'
  impedimentos: Impedimento[]
}

const OK: Veredito = { permitido: true, impedimentos: [] }

// ── Helpers de estado ────────────────────────────────────────

/**
 * Um contrato "prende" a conta/solução enquanto não estiver inativo E dentro da
 * vigência. Contrato 'Ativo' com `dataTermino` no passado está fora de vigência
 * e não bloqueia — é o caso do fixture `6e20fc54…`.
 */
export function contratoVigente(c: Contract): boolean {
  if (c.status === 'Inativo') return false
  const termino = parsearData(c.dataTermino)
  if (!termino) return true // sem data legível → trata como vigente (conservador)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return termino.getTime() >= hoje.getTime()
}

// HIPÓTESE: status 'Criado' conta como não-inativo — bloqueia a inativação do
// nível acima e impede a exclusão direta (hipótese 4). Consistente com o
// `status !== 'Inativo'` já usado no resto do código.
const inativo = (status: string) => status === 'Inativo'

const rotuloContrato = (c: Contract) => `Contrato · ${c.contratante}`
const detalheVigencia = (c: Contract) => {
  const termino = parsearData(c.dataTermino)
  return termino
    ? `vigente até ${String(termino.getDate()).padStart(2, '0')}/${String(termino.getMonth() + 1).padStart(2, '0')}/${termino.getFullYear()}`
    : 'vigente'
}

// ── Consultas de vínculo (exportadas p/ os sheets decidirem o rótulo do botão) ──

export function contratosDaConta(conta: Account, contratos: Contract[]): Contract[] {
  // Sem FK: contracts.contratante = accounts.name, escopado por org (nomes não são únicos).
  return contratos.filter(c => c.orgId === conta.orgId && c.contratante === conta.name)
}

export function contratosVigentesDaConta(conta: Account, contratos: Contract[]): Contract[] {
  return contratosDaConta(conta, contratos).filter(contratoVigente)
}

export function contratosDaSolucao(sol: Solution, contratos: Contract[]): Contract[] {
  return contratos.filter(c => c.objetos.some(o => o.solucao === sol.name))
}

// HIPÓTESE: solução é entidade de catálogo comercial (hipótese 2) — inativar
// conta ou organização não a afeta. O vínculo direto solução↔conta existe só
// para a regra de exclusão de conta ("sem nenhuma solução vinculada").
export function solucoesDaConta(conta: Account, solucoes: Solution[]): Solution[] {
  return solucoes.filter(s => s.accountId === conta.id)
}

export function contasAtivasDaOrg(org: Organization, contas: Account[]): Account[] {
  return contas.filter(a => a.orgId === org.id && !inativo(a.status))
}

// ── INATIVAÇÃO (reversível, não altera dependentes) ──────────

/** Contrato é o único nível inativável diretamente, sem pré-requisito. */
export function podeInativarContrato(): Veredito {
  return OK
}

/** Conta só inativa se todos os contratos vinculados estiverem inativos ou fora de vigência. */
export function podeInativarConta(conta: Account, contratos: Contract[]): Veredito {
  const bloqueiam = contratosVigentesDaConta(conta, contratos)
  if (bloqueiam.length === 0) return OK
  return {
    permitido: false,
    motivo: 'vinculos',
    impedimentos: bloqueiam.map(c => ({
      tipo: 'contrato',
      id: c.id,
      nome: rotuloContrato(c),
      detalhe: detalheVigencia(c),
    })),
  }
}

/** Organização só inativa se todas as contas vinculadas estiverem inativas. */
export function podeInativarOrganizacao(org: Organization, contas: Account[]): Veredito {
  const bloqueiam = contasAtivasDaOrg(org, contas)
  if (bloqueiam.length === 0) return OK
  return {
    permitido: false,
    motivo: 'vinculos',
    impedimentos: bloqueiam.map(a => ({
      tipo: 'conta',
      id: a.id,
      nome: a.name,
      detalhe: a.status === 'Criado' ? 'aguardando provisionamento' : 'ativa',
    })),
  }
}

// ── EXCLUSÃO (permanente, nunca cascateia, exige registro inativo) ──

/** Contrato NUNCA é excluível — registro jurídico e fiscal, sobrevive para auditoria. */
export function podeExcluirContrato(): Veredito {
  return { permitido: false, motivo: 'nunca', impedimentos: [] }
}

/** Organização: excluível apenas sem nenhuma conta vinculada (inclui contas em quarentena). */
export function podeExcluirOrganizacao(org: Organization, contas: Account[]): Veredito {
  // HIPÓTESE 4: exclusão exige que o registro esteja inativo.
  if (!inativo(org.status)) return { permitido: false, motivo: 'registro-ativo', impedimentos: [] }

  // Decisão: conta em quarentena (deletedAt preenchido) ainda é registro vinculado
  // e bloqueia — "exclusão nunca cascateia".
  const vinculadas = contas.filter(a => a.orgId === org.id)
  if (vinculadas.length === 0) return OK
  return {
    permitido: false,
    motivo: 'vinculos',
    impedimentos: vinculadas.map(a => ({
      tipo: 'conta',
      id: a.id,
      nome: a.name,
      detalhe: a.deletedAt ? 'em quarentena' : inativo(a.status) ? 'inativa' : 'ativa',
    })),
  }
}

/** Conta: excluível apenas sem nenhuma solução e sem nenhum contrato vinculado. */
export function podeExcluirConta(
  conta: Account,
  solucoes: Solution[],
  contratos: Contract[],
  usuarios: User[],
): Veredito {
  // HIPÓTESE 4: exclusão exige que o registro esteja inativo.
  if (!inativo(conta.status)) return { permitido: false, motivo: 'registro-ativo', impedimentos: [] }

  const impedimentos: Impedimento[] = [
    ...solucoesDaConta(conta, solucoes).map((s): Impedimento => ({
      tipo: 'solucao', id: s.id, nome: s.name,
    })),
    ...contratosDaConta(conta, contratos).map((c): Impedimento => ({
      tipo: 'contrato', id: c.id, nome: rotuloContrato(c),
      detalhe: c.status === 'Inativo' ? 'inativo' : detalheVigencia(c),
    })),
    // HIPÓTESE 3: usuários vinculados entram na lista de impedimentos.
    ...usuarios.map((u): Impedimento => ({
      tipo: 'usuario', id: u.id, nome: u.nomeCompleto,
    })),
  ]
  if (impedimentos.length === 0) return OK
  return { permitido: false, motivo: 'vinculos', impedimentos }
}

/** Solução: excluível apenas sem nenhum componente e sem nenhum contrato vinculado. */
export function podeExcluirSolucao(sol: Solution, contratos: Contract[]): Veredito {
  // HIPÓTESE 4: exclusão exige que o registro esteja inativo.
  if (!inativo(sol.status)) return { permitido: false, motivo: 'registro-ativo', impedimentos: [] }

  const impedimentos: Impedimento[] = [
    ...(sol.componenteIds ?? []).map((id): Impedimento => ({
      tipo: 'componente', id, nome: id,
    })),
    ...contratosDaSolucao(sol, contratos).map((c): Impedimento => ({
      tipo: 'contrato', id: c.id, nome: rotuloContrato(c),
      detalhe: c.status === 'Inativo' ? 'inativo' : detalheVigencia(c),
    })),
  ]
  if (impedimentos.length === 0) return OK
  return { permitido: false, motivo: 'vinculos', impedimentos }
}
