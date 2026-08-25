/**
 * Simulação da Fase 2 (`solutionPublicationByContract`) — DESCARTÁVEL.
 *
 * Este arquivo inteiro existe só porque o `pas-cockpit-worker` ainda não expõe
 * endpoint de status por contrato. Ele simula, no relógio do navegador, o que o
 * worker faria de verdade: ao criar um contrato, provisionar cada solução em
 * sequência, uma de cada vez, levando minutos.
 *
 * Quando o worker real entrar, **apague este arquivo** e faça
 * `getContractProvisioning` (em provisioning.ts) chamar o endpoint. Nenhum
 * componente importa este módulo diretamente — só o serviço.
 */

import type { SolutionProvisioning } from '@/types'

/**
 * Duração simulada do provisionamento de UMA solução.
 *
 * Tempos reais medidos pelo time (handoff 19/08/2026): CMS ~4 min, base de
 * conhecimento ~2 min — cada solução cria seu esquema no banco, roda migrações
 * e popula estruturas iniciais. Aqui o tempo é comprimido para que o ciclo
 * completo seja demonstrável numa sessão de validação.
 *
 * Para ensaiar com o tempo real, troque para `4 * 60_000`.
 */
export const FASE2_DURACAO_MS_POR_SOLUCAO = 20_000

const STORAGE_KEY = 'pas.fase2.simulacao'
const STORAGE_KEY_FALHAS = 'pas.fase2.falhas'

/**
 * Escape hatch de validação: soluções cujo nome esteja aqui falham ao
 * provisionar, permitindo exercitar o caminho de erro sem editar fixtures.
 *
 * Fica em sessionStorage para que quem valida a tela consiga acionar uma
 * falha sem mexer no código. No console do navegador:
 *
 *   sessionStorage.setItem('pas.fase2.falhas', JSON.stringify(['PAS Flow']))
 *
 * Some ao fechar a aba.
 */
function solucoesQueFalham(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_FALHAS)
    const lista = raw ? JSON.parse(raw) : []
    return Array.isArray(lista) ? lista : []
  } catch {
    return []
  }
}

interface ExecucaoFase2 {
  contratoId: string
  accountId: string
  /** Nomes das soluções, na ordem em que o worker as provisionaria. */
  solucoes: string[]
  /** Epoch ms do disparo. */
  iniciadoEm: number
  /**
   * Solução → epoch ms da reexecução. Uma solução aqui sai da fila sequencial
   * e passa a contar a janela a partir do próprio instante do retry.
   *
   * **Limitação da simulação:** a reexecução sempre conclui com sucesso, mesmo
   * que a solução esteja no gatilho de falha. É deliberado — o objetivo aqui é
   * demonstrar a recuperação. Quem decide se uma reexecução falha de novo é o
   * worker; para reproduzir isso, dispare uma nova execução com o gatilho
   * ativo.
   */
  reexecucoes?: Record<string, number>
}

/**
 * Estado em memória, espelhado em sessionStorage para que sair da tela,
 * navegar e voltar — inclusive com reload — continue mostrando o estado certo.
 */
let execucoes: Record<string, ExecucaoFase2> = carregar()

function carregar(): Record<string, ExecucaoFase2> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ExecucaoFase2>) : {}
  } catch {
    return {}
  }
}

function persistir(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(execucoes))
  } catch {
    // sessionStorage indisponível (modo privado, quota) — a simulação segue
    // funcionando em memória até o reload. Não é erro de usuário.
  }
}

/** Registra o disparo da Fase 2 para um contrato recém-criado ou alterado. */
export function registrarExecucaoFase2(
  contratoId: string,
  accountId: string,
  solucoes: string[],
): void {
  if (solucoes.length === 0) return
  execucoes[contratoId] = {
    contratoId,
    accountId,
    solucoes,
    iniciadoEm: Date.now(),
  }
  persistir()
}

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

/**
 * Deriva o estado de cada solução a partir do tempo decorrido. As soluções são
 * provisionadas em sequência — a segunda só começa quando a primeira termina,
 * como no workflow real.
 */
function derivar(exec: ExecucaoFase2): SolutionProvisioning[] {
  const agora = Date.now()

  return exec.solucoes.map((nome, i) => {
    // Reexecutada: a janela recomeça no instante do retry, fora da fila.
    const retry = exec.reexecucoes?.[nome]
    const inicio = retry ?? exec.iniciadoEm + i * FASE2_DURACAO_MS_POR_SOLUCAO
    const fim = inicio + FASE2_DURACAO_MS_POR_SOLUCAO
    const base = { solucaoNome: nome, contratoId: exec.contratoId }

    if (agora < inicio) {
      return { ...base, estado: 'pendente' as const, iniciadoEm: null, concluidoEm: null, duracaoMs: null, erro: null }
    }

    if (agora < fim) {
      return { ...base, estado: 'em-andamento' as const, iniciadoEm: toIso(inicio), concluidoEm: null, duracaoMs: null, erro: null }
    }

    if (retry === undefined && solucoesQueFalham().includes(nome)) {
      return {
        ...base,
        estado: 'erro' as const,
        iniciadoEm: toIso(inicio),
        concluidoEm: toIso(fim),
        duracaoMs: FASE2_DURACAO_MS_POR_SOLUCAO,
        erro: {
          codigo: 'SOLUTION_SCHEMA_MIGRATION_FAILED',
          mensagem: `Falha ao criar as estruturas de dados da solução «${nome}» no ambiente do cliente.`,
          ocorridoEm: toIso(fim),
          tentativas: 3,
          podeReexecutar: true,
        },
      }
    }

    return {
      ...base,
      estado: 'criado' as const,
      iniciadoEm: toIso(inicio),
      concluidoEm: toIso(fim),
      duracaoMs: FASE2_DURACAO_MS_POR_SOLUCAO,
      detalhes: { ambiente: 'tenant' },
      erro: null,
    }
  })
}

/** Soluções em provisionamento de UM contrato. Vazio = contrato não simulado. */
export function solucoesDoContrato(contratoId: string): SolutionProvisioning[] {
  const exec = execucoes[contratoId]
  return exec ? derivar(exec) : []
}

/** Soluções em provisionamento de TODOS os contratos de uma conta. */
export function solucoesDaConta(accountId: string): SolutionProvisioning[] {
  return Object.values(execucoes)
    .filter(e => e.accountId === accountId)
    .flatMap(derivar)
}

/** Só para testes manuais — limpa a simulação da sessão. */
export function limparSimulacaoFase2(): void {
  execucoes = {}
  persistir()
}
