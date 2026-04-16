import { Plus } from 'lucide-react'
import type { Componente } from '@/types'

interface Props {
  componentes: Componente[]
  value: string[]                // IDs selecionados
  onChange: (ids: string[]) => void
  onCreateNew?: () => void       // Abre dialog de novo componente
}

/**
 * Multi-select de Componentes para associar a uma Solução.
 * Exibe cada componente como um item clicável com checkbox.
 * O botão "Novo componente" é exibido apenas se onCreateNew for fornecido.
 */
export function ComponenteSelector({ componentes, value, onChange, onCreateNew }: Props) {
  function toggle(id: string) {
    onChange(
      value.includes(id)
        ? value.filter(i => i !== id)
        : [...value, id]
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {componentes.length === 0 && !onCreateNew ? (
        <p className="text-sm text-[#6b7280]">Nenhum componente cadastrado.</p>
      ) : (
        <>
          {componentes.map(c => {
            const checked = value.includes(c.id)
            return (
              <label
                key={c.id}
                className={`flex items-start gap-3 px-4 py-3 border rounded-md cursor-pointer transition-colors ${
                  checked
                    ? 'border-[#2563eb] bg-blue-50'
                    : 'border-[#e5e7eb] bg-white hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  className="mt-0.5 w-4 h-4 rounded border-[#e5e7eb] text-blue-600 shadow-sm cursor-pointer shrink-0"
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-medium text-[#030712] leading-5">{c.nome}</p>
                  {c.descricao && (
                    <p className="text-xs text-[#6b7280] leading-4">{c.descricao}</p>
                  )}
                </div>
              </label>
            )
          })}

          {onCreateNew && (
            <button
              type="button"
              onClick={onCreateNew}
              className="flex items-center gap-1.5 h-9 px-3 border border-dashed border-[#d1d5db] rounded-md text-sm text-[#6b7280] hover:border-[#9ca3af] hover:text-[#030712] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo componente
            </button>
          )}
        </>
      )}
    </div>
  )
}
