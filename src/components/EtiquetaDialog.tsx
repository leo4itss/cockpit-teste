import { useState } from 'react'
import { Search } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'

// Opções de etiqueta disponíveis (protótipo)
const ETIQUETAS = [
  'Comercial',
  'Estratégico',
  'Técnico',
  'Suporte',
  'Gestão',
  'Produto',
  'Financeiro',
]

interface Props {
  open: boolean
  onClose: () => void
  value: string        // etiqueta atualmente selecionada (pode ser vazia)
  onSave: (etiqueta: string) => void
}

export function EtiquetaDialog({ open, onClose, value, onSave }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(value)

  const filtered = ETIQUETAS.filter(e =>
    e.toLowerCase().includes(search.toLowerCase())
  )

  function handleSave() {
    onSave(selected)
    onClose()
  }

  function handleClose() {
    setSelected(value)
    setSearch('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Etiqueta de classificação"
      className="max-w-[560px]"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none" />
          <input
            type="text"
            placeholder="Busque área de atuação"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-[#e5e7eb] rounded-md text-sm text-[#030712] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            autoFocus
          />
        </div>

        {/* Lista de etiquetas */}
        {filtered.length === 0 ? (
          <p className="text-sm text-[#9ca3af] py-2">Nenhum item encontrado</p>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setSelected(prev => prev === e ? '' : e)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${
                  selected === e
                    ? 'bg-blue-50 text-[#2563eb] font-medium'
                    : 'text-[#030712] hover:bg-gray-50'
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  selected === e ? 'bg-[#2563eb] border-[#2563eb]' : 'border-[#d1d5db]'
                }`}>
                  {selected === e && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Estado vazio quando nenhum selecionado */}
        {!selected && filtered.length > 0 && (
          <p className="text-xs text-[#9ca3af]">Nenhum item selecionado</p>
        )}
      </div>
    </Dialog>
  )
}
