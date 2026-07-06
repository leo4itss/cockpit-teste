/**
 * Lógica pura de "Combinar papéis" — compartilhada entre PermissoesMembroSheet
 * (um componente por vez) e AtribuirPermissoesSheet (múltiplos componentes).
 *
 * Como instancia_membros.papel e a inferência de papel só guardam um valor,
 * uma combinação de papéis é sempre persistida como 'personalizado'. Essas
 * funções cuidam das duas pontas: calcular a união de ações de um conjunto de
 * papéis, e — ao reabrir — reconstruir qual conjunto gerou um dado resultado.
 */

import type { PapelDef } from './mock'

/** União das ações padrão de um conjunto de papéis. */
export function unirAcoesDosPapeis(papeis: PapelDef[], valores: Set<string>, catalogo: string[]): string[] {
  const acoes = new Set<string>()
  for (const valor of valores) {
    const papelDef = papeis.find(p => p.value === valor)
    if (!papelDef) continue
    const defaults = papelDef.defaultAcoes ?? []
    // [] = todas as ações do catálogo (padrão Administrador)
    const acoesDoPapel = defaults.length > 0 ? defaults : catalogo
    acoesDoPapel.forEach(a => acoes.add(a))
  }
  return [...acoes]
}

/**
 * Tenta reconstruir quais papéis foram combinados a partir do conjunto de ações salvo.
 * Necessário porque a combinação é persistida como papel='personalizado' (sem coluna
 * própria para guardar a lista) — ao reabrir, a única forma de "lembrar" a combinação
 * é comparar o conjunto de ações salvo contra a união de cada combinação possível de
 * papéis nomeados.
 *
 * Busca por tamanho crescente (1, 2, 3...) e retorna a MENOR combinação que bate
 * exatamente — isso evita ambiguidade quando Administrador (defaultAcoes: [] = todas
 * as ações) está envolvido: como Administrador sozinho já cobre o catálogo inteiro,
 * qualquer combinação "outro papel + Administrador" produziria a mesma união dele
 * sozinho, então sempre preferimos o papel único quando ele já basta.
 *
 * Retorna um Set com 1 item para papel único, ou 2+ para combinação real.
 * Retorna null se nada bater exatamente (ex.: edição manual avulsa).
 */
export function inferirCombinacaoDePapeis(papeis: PapelDef[], existingAcoes: string[], catalogo: string[]): Set<string> | null {
  if (existingAcoes.length === 0) return null
  const existingSet = new Set(existingAcoes)
  const valores = papeis.map(p => p.value)
  const n = valores.length
  if (n > 12) return null // segurança: evita explosão combinatória

  const subsetsPorTamanho: string[][] = []
  for (let mask = 1; mask < (1 << n); mask++) {
    const subset: string[] = []
    for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(valores[i])
    subsetsPorTamanho.push(subset)
  }
  subsetsPorTamanho.sort((a, b) => a.length - b.length)

  for (const subset of subsetsPorTamanho) {
    const union = new Set(unirAcoesDosPapeis(papeis, new Set(subset), catalogo))
    if (union.size === existingSet.size && [...union].every(a => existingSet.has(a))) {
      return new Set(subset)
    }
  }
  return null
}
