/**
 * Formatação de data e hora — fonte única.
 *
 * A tela de provisionamento chegava a exibir três formatos lado a lado:
 * `28/07/2026` (vindo cru do banco), `19/08/2026, 18:34:12` (toLocaleString) e
 * `2026-08-19` (ISO da vigência do contrato). Em investigação de incidente,
 * formato ambíguo e fuso não declarado custam caro.
 *
 * Convenção adotada:
 * - Data seca: `dd/mm/aaaa`
 * - Data com hora: `dd/mm/aaaa HH:mm:ss` (sem vírgula, para alinhar em colunas)
 * - Horários são do **relógio de quem abre a tela**, não do servidor. O fuso é
 *   declarado uma vez por painel (ver `FUSO_LOCAL`), não repetido em cada linha.
 * - O carimbo em UTC continua disponível no payload técnico do erro.
 */

/** Fuso do navegador em formato curto — ex.: `GMT-3`. */
export const FUSO_LOCAL: string = (() => {
  try {
    const parte = new Intl.DateTimeFormat('pt-BR', { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')
    return parte?.value ?? 'horário local'
  } catch {
    return 'horário local'
  }
})()

/** Só aceita o que o `Date` consegue interpretar; devolve null no resto. */
function parse(valor: string | number | Date | null | undefined): Date | null {
  if (valor === null || valor === undefined || valor === '') return null
  const d = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

/** true para strings que já estão em `dd/mm/aaaa` — vêm assim de fixtures antigos. */
function jaFormatada(valor: unknown): valor is string {
  return typeof valor === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)
}

const PAD = (n: number) => String(n).padStart(2, '0')

/**
 * `dd/mm/aaaa`. Tolera ISO (`2026-08-19`), ISO completo e valores que já vêm
 * formatados — nesse caso devolve como está, em vez de virar "Invalid Date".
 */
export function formatarData(valor: string | number | Date | null | undefined): string {
  if (jaFormatada(valor)) return valor

  // `2026-08-19` puro seria lido como UTC e poderia recuar um dia a oeste de
  // Greenwich. Datas secas não têm fuso — monta local e evita o off-by-one.
  if (typeof valor === 'string') {
    const seca = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
    if (seca) return `${seca[3]}/${seca[2]}/${seca[1]}`
  }

  const d = parse(valor)
  if (!d) return '—'
  return `${PAD(d.getDate())}/${PAD(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** `dd/mm/aaaa HH:mm:ss`, no fuso do navegador. Ver `FUSO_LOCAL`. */
export function formatarDataHora(valor: string | number | Date | null | undefined): string {
  const d = parse(valor)
  if (!d) return '—'
  return (
    `${PAD(d.getDate())}/${PAD(d.getMonth() + 1)}/${d.getFullYear()}` +
    ` ${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`
  )
}
