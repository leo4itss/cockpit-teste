import { useState, useEffect } from 'react'
import { Search, Plus, Puzzle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ComponenteSheet } from '@/components/ComponenteSheet'
import { api } from '@/api/client'
import { tiposLicenca as mockTiposLicenca, componentes as mockComponentes } from '@/data/mock'
import type { TipoLicenca, Componente } from '@/types'

export function ComponentesPage() {
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [tiposLicenca, setTiposLicenca] = useState<TipoLicenca[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingComponente, setEditingComponente] = useState<Componente | null>(null)

  useEffect(() => {
    Promise.all([api.getComponentes(), api.getTiposLicenca()])
      .then(([comps, tipos]) => {
        setComponentes(comps)
        setTiposLicenca(tipos)
        setLoading(false)
      })
      .catch(() => {
        // Fallback para mock quando API indisponível (preview Vercel)
        setComponentes(mockComponentes)
        setTiposLicenca(mockTiposLicenca)
        setLoading(false)
      })
  }, [])

  const filtered = componentes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.descricao ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave(data: Omit<Componente, 'id' | 'createdAt'>) {
    if (editingComponente) {
      const saved = await api.updateComponente(editingComponente.id, {
        ...editingComponente,
        ...data,
      })
      setComponentes(prev => prev.map(c => c.id === saved.id ? saved : c))
    } else {
      const saved = await api.createComponente({
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      })
      setComponentes(prev => [...prev, saved])
    }
  }

  function handleOpenEdit(c: Componente) {
    setEditingComponente(c)
    setSheetOpen(true)
  }

  function handleOpenNew() {
    setEditingComponente(null)
    setSheetOpen(true)
  }

  function handleClose() {
    setSheetOpen(false)
    setEditingComponente(null)
  }

  // Resolves nomes dos tipos de licença a partir dos IDs
  function tiposNomes(ids: string[]) {
    return ids
      .map(id => tiposLicenca.find(t => t.id === id)?.nome ?? id)
      .join(', ')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="border-b border-[#e5e7eb] bg-white shrink-0">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[30px] font-bold leading-9 text-[#030712]">Componentes</h1>
            <p className="text-base text-[#6b7280] leading-6">
              Módulos e serviços disponíveis para compor soluções.
            </p>
          </div>
          <Button onClick={handleOpenNew}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo componente
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8 flex flex-col gap-5">

        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar componente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-[#e5e7eb] rounded-md text-sm text-[#030712] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
          />
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-sm text-[#6b7280]">Carregando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            search={search}
            onNew={handleOpenNew}
          />
        ) : (
          <div className="border border-[#e5e7eb] rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-[#e5e7eb]">
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Nome</th>
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Descrição</th>
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Tipos de Licença</th>
                  <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-[#e5e7eb] last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleOpenEdit(c)}
                  >
                    <td className="px-4 py-3 h-[52px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center shrink-0">
                          <Puzzle className="w-4 h-4 text-[#6b7280]" />
                        </div>
                        <span className="text-sm font-medium text-[#030712]">{c.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 h-[52px] text-sm text-[#6b7280] max-w-[240px] truncate">
                      {c.descricao || '—'}
                    </td>
                    <td className="px-4 py-3 h-[52px] text-sm text-[#030712]">
                      {c.tiposLicenca.length === 0 ? (
                        <span className="text-[#9ca3af]">—</span>
                      ) : (
                        <span className="truncate max-w-[220px] block" title={tiposNomes(c.tiposLicenca)}>
                          {c.tiposLicenca.length} tipo{c.tiposLicenca.length > 1 ? 's' : ''}
                          <span className="text-[#6b7280] ml-1">
                            ({tiposNomes(c.tiposLicenca)})
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 h-[52px]">
                      {c.metadataUrl ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Configurada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          Não configurada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ComponenteSheet
        open={sheetOpen}
        onClose={handleClose}
        onSave={handleSave}
        tiposLicenca={tiposLicenca}
        initialComponente={editingComponente ?? undefined}
      />
    </div>
  )
}

function EmptyState({ search, onNew }: { search: string; onNew: () => void }) {
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-sm font-medium text-[#030712]">Nenhum componente encontrado</p>
        <p className="text-xs text-[#6b7280]">Tente buscar por outro termo.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 rounded-full bg-[#f3f4f6] flex items-center justify-center">
        <Puzzle className="w-5 h-5 text-[#6b7280]" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-[#030712]">Nenhum componente cadastrado</p>
        <p className="text-xs text-[#6b7280]">Crie o primeiro componente para começar.</p>
      </div>
      <Button onClick={onNew} variant="outline">
        <Plus className="w-4 h-4 mr-1.5" />
        Novo componente
      </Button>
    </div>
  )
}
