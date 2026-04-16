import { useState } from 'react'
import { Search, Puzzle, Check } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import type { Componente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  componentes: Componente[]
  value: string[]              // IDs selecionados
  onChange: (ids: string[]) => void
}

/**
 * Sheet de seleção de componentes — usado quando há > 5 componentes disponíveis.
 * Exibe lista pesquisável com checkboxes. A confirmação aplica a seleção e fecha.
 */
export function ComponenteSelecaoSheet({ open, onClose, componentes, value, onChange }: Props) {
  const [search, setSearch] = useState('')
  // cópia local da seleção enquanto o sheet está aberto
  const [localSelected, setLocalSelected] = useState<string[]>(value)

  // Sincroniza local quando o sheet abre
  function handleOpen() {
    setLocalSelected(value)
    setSearch('')
  }

  const filtered = componentes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.descricao ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function toggle(id: string) {
    setLocalSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function handleConfirm() {
    onChange(localSelected)
    onClose()
  }

  function handleClose() {
    setLocalSelected(value) // descarta mudanças locais
    setSearch('')
    onClose()
  }

  // Invoca handleOpen quando open muda para true
  const [wasOpen, setWasOpen] = useState(false)
  if (open && !wasOpen) { setWasOpen(true); handleOpen() }
  if (!open && wasOpen) { setWasOpen(false) }

  const selectedCount = localSelected.length

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Selecionar componentes"
      description="Escolha os módulos que compõem esta solução. Os tipos de licença serão derivados automaticamente."
      width="w-[520px]"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>
            Confirmar{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar componente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-[#e5e7eb] rounded-md text-sm text-[#030712] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="text-sm text-[#6b7280] text-center py-8">Nenhum componente encontrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(c => {
              const checked = localSelected.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`flex items-start gap-3 px-4 py-3 border rounded-md text-left transition-colors w-full ${
                    checked
                      ? 'border-[#2563eb] bg-blue-50'
                      : 'border-[#e5e7eb] bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Checkbox visual */}
                  <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    checked ? 'bg-[#2563eb] border-[#2563eb]' : 'border-[#d1d5db] bg-white'
                  }`}>
                    {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>

                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center shrink-0 mt-0.5">
                      <Puzzle className="w-4 h-4 text-[#6b7280]" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-medium text-[#030712] leading-5">{c.nome}</p>
                      {c.descricao && (
                        <p className="text-xs text-[#6b7280] leading-4 truncate">{c.descricao}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Sheet>
  )
}
