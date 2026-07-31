import { useState } from 'react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import type { Solution, Contract, ObjetoContrato, ValorLicencaContrato } from '@/types'

// Alias mantido para compatibilidade com importadores existentes
export type { ObjetoContrato as ObjetoSelecionado }

interface Row {
  id: string
  solucao: string
  componenteIds: string[]
  plano: string
  planoVersao: number
  licenciamento: string
  status: string
  valoresLicenca: ValorLicencaContrato[]
}

interface Props {
  open: boolean
  onClose: () => void
  solutions: Solution[]
  /** Conta contratante deste contrato — usada para checar exclusividade de componente por conta */
  contratante: string
  /** Outros contratos existentes (o próprio contrato, se em edição, deve vir excluído pelo chamador) */
  contracts: Contract[]
  onSave: (objetos: ObjetoContrato[]) => void
}

/** Componentes já em uso por outros contratos ATIVOS da mesma conta (contratante). */
function occupiedComponenteIds(solutions: Solution[], contratante: string, contracts: Contract[]): Set<string> {
  const componenteIdsPorSolucao = new Map<string, string[]>()
  solutions.forEach(s => componenteIdsPorSolucao.set(s.name, s.componenteIds ?? []))

  const occupied = new Set<string>()
  contracts
    .filter(ct => ct.contratante === contratante && ct.status !== 'Inativo')
    .forEach(ct => {
      ct.objetos.forEach(obj => {
        (componenteIdsPorSolucao.get(obj.solucao) ?? []).forEach(cid => occupied.add(cid))
      })
    })
  return occupied
}

function buildRows(solutions: Solution[]): Row[] {
  const rows: Row[] = []
  solutions.forEach(sol => {
    // Apenas planos ativos (versão vigente) estão disponíveis para novos contratos
    const activePlans = sol.plans.filter(p => !p.statusVersao || p.statusVersao === 'ativo')

    if (activePlans.length === 0) {
      // Solução sem planos ativos: exibe mesmo assim com valores vazios
      rows.push({
        id: sol.id,
        solucao: sol.name,
        plano: '—',
        planoVersao: 1,
        licenciamento: '—',
        status: sol.status,
        valoresLicenca: [],
      })
      return
    }

    activePlans.forEach(plan => {
      // Monta label de licenciamento a partir do novo formato (tipoLicencaNome + range + excedente)
      const licenciamento = plan.licensings.length > 0
        ? plan.licensings.map(l => {
            const unidade = l.tipoLicencaUnidade ?? ''
            const nome = l.tipoLicencaNome || l.tipoLicencaId
            const min = l.valorMinimo?.trim?.()
            const max = l.valorMaximo?.trim?.()
            const val = l.valor?.trim()
            let range = ''
            if (min && max) range = `${min}–${max} ${unidade}`.trim()
            else if (min) range = `${min} ${unidade}`.trim()
            else if (max) range = `Até ${max} ${unidade}`.trim()
            else if (val) range = `${val} ${unidade}`.trim()
            const excedenteLabel = l.excedenteSemLimite
              ? ' (excedente: sem limite)'
              : l.excedente?.trim()
                ? ` (excedente até ${l.excedente.trim()} ${unidade})`.replace(/ \)/, ')')
                : ''
            return (range ? `${nome}: ${range}` : nome) + excedenteLabel
          }).join(' · ') || '—'
        : '—'

      rows.push({
        id: `${sol.id}-${plan.name}`,
        solucao: sol.name,
        plano: plan.name,
        planoVersao: plan.versao ?? 1,
        licenciamento,
        status: sol.status,
        valoresLicenca: plan.licensings.map(l => ({
          tipoLicencaNome: l.tipoLicencaNome || l.tipoLicencaId,
          tipoLicencaUnidade: l.tipoLicencaUnidade,
          valor: l.valorMinimo?.trim() || l.valor?.trim() || '',
          excedente: l.excedente,
          excedenteSemLimite: l.excedenteSemLimite,
        })),
      })
    })
  })
  return rows
}

export function AddObjetoDialog({ open, onClose, solutions, onSave }: Props) {
  const rows = buildRows(solutions)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSave() {
    const objetos: ObjetoContrato[] = rows
      .filter(r => selected.has(r.id))
      .map(r => ({
        solucao: r.solucao,
        plano: r.plano,
        licenciamento: r.licenciamento,
        planoVersao: r.planoVersao,
        valoresLicenca: r.valoresLicenca,
      }))
    onSave(objetos)
    setSelected(new Set())
    onClose()
  }

  function handleClose() {
    setSelected(new Set())
    onClose()
  }

  const allChecked = rows.length > 0 && selected.size === rows.length
  const someChecked = selected.size > 0 && selected.size < rows.length

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Objeto do contrato"
      className="max-w-[960px]"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          Nenhuma solução disponível para esta organização.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e5e7eb]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                <th className="w-10 px-3 py-2.5 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-[#e5e7eb] text-blue-600 shadow-sm cursor-pointer"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked }}
                    onChange={toggleAll}
                  />
                </th>
                {['Solução', 'Plano', 'Licença', 'Status'].map(col => (
                  <th
                    key={col}
                    className="px-2 py-2.5 text-left text-sm font-medium text-[#030712] opacity-40 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const checked = selected.has(row.id)
                return (
                  <tr
                    key={row.id}
                    className="border-b border-[#e5e7eb] last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggle(row.id)}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-[#e5e7eb] text-blue-600 shadow-sm cursor-pointer"
                        checked={checked}
                        onChange={() => toggle(row.id)}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    {/* Solução — com avatar */}
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
                          {row.solucao.charAt(0)}
                        </div>
                        <span className="text-sm text-[#030712] truncate max-w-[140px]">{row.solucao}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-sm text-[#030712] whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {row.plano}
                        {row.planoVersao > 1 && (
                          <span className="text-xs text-[#6b7280] bg-[#f3f4f6] border border-[#e5e7eb] px-1 py-0.5 rounded">
                            v{row.planoVersao}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-sm text-[#030712] max-w-[260px] truncate">{row.licenciamento}</td>
                    <td className="px-2 py-3">
                      <Badge variant="success" showIcon>{row.status}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  )
}
