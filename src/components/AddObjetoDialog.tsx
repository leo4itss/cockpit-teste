import { useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import type { Solution, ObjetoContrato } from '@/types'

// Alias mantido para compatibilidade com importadores existentes
export type { ObjetoContrato as ObjetoSelecionado }

interface Row {
  id: string
  solucao: string
  orgContratada: string
  plano: string
  licenciamento: string
  status: string
}

interface Props {
  open: boolean
  onClose: () => void
  solutions: Solution[]
  orgName: string
  onSave: (objetos: ObjetoContrato[]) => void
}

function buildRows(solutions: Solution[], orgName: string): Row[] {
  const rows: Row[] = []
  solutions.forEach(sol => {
    sol.plans.forEach(plan => {
      // Monta label de licenciamento a partir do novo formato (tipoLicencaNome + range)
      const licenciamento = plan.licensings.length > 0
        ? plan.licensings.map(l => {
            const range = [l.valorMinimo, l.valorMaximo].filter(Boolean).join('–')
            const nome = l.tipoLicencaNome || l.tipoLicencaId
            return range ? `${nome}: ${range} ${l.tipoLicencaUnidade ?? ''}`.trim() : nome
          }).join(' · ') || '—'
        : '—'

      rows.push({
        id: `${sol.id}-${plan.name}`,
        solucao: sol.name,
        orgContratada: orgName,
        plano: plan.name,
        licenciamento,
        status: sol.status,
      })
    })
  })
  return rows
}

export function AddObjetoDialog({ open, onClose, solutions, orgName, onSave }: Props) {
  const rows = buildRows(solutions, orgName)
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
        orgContratada: r.orgContratada,
        plano: r.plano,
        licenciamento: r.licenciamento,
        qtdContratada: 1,
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
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
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
                {['Solução', 'Organização contratada', 'Plano', 'Licença', 'Status'].map(col => (
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
                    <td className="px-2 py-3 text-sm text-[#030712] whitespace-nowrap">{row.orgContratada}</td>
                    <td className="px-2 py-3 text-sm text-[#030712] whitespace-nowrap">{row.plano}</td>
                    <td className="px-2 py-3 text-sm text-[#030712] max-w-[260px] truncate">{row.licenciamento}</td>
                    <td className="px-2 py-3">
                      <span className="inline-flex items-center gap-1 bg-green-200 text-green-700 text-xs font-semibold px-2 py-1 rounded-sm whitespace-nowrap">
                        <BadgeCheck className="w-3 h-3" />
                        {row.status}
                      </span>
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
