import { useState } from 'react'
import { Search, Plus, FolderOpen, Cpu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ComponenteSheet, METADATA_MOCK_TIPOS } from '@/components/ComponenteSheet'
import { ComponenteDetailSheet } from '@/components/ComponenteDetailSheet'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { useComponentes } from '@/context/ComponentesContext'
import type { Componente } from '@/types'

export function ComponentesPage() {
  const { componentes, loading, addComponente, updateComponente, deleteComponente, reativarComponente } = useComponentes()
  const [search, setSearch] = useState('')

  // Sheet de detalhe (leitura)
  const [detailComponente, setDetailComponente] = useState<Componente | null>(null)

  // Sheet de edição/criação
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingComponente, setEditingComponente] = useState<Componente | null>(null)

  // Modais de delete/inativar
  const [deleteModal, setDeleteModal] = useState<'excluir-componente' | 'inativar-componente' | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Mostra ativos por padrão; toggle para ver inativos também
  const [showInativos, setShowInativos] = useState(false)

  const filtered = componentes
    .filter(c => showInativos || c.status !== 'Inativo')
    .filter(c =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.descricao ?? '').toLowerCase().includes(search.toLowerCase())
    )

  async function handleSave(data: Omit<Componente, 'id' | 'createdAt'>) {
    if (editingComponente) {
      await updateComponente(editingComponente.id, data)
    } else {
      await addComponente(data)
    }
  }

  function handleOpenDetail(c: Componente) {
    setDetailComponente(c)
  }

  function handleOpenEdit(c: Componente) {
    setDetailComponente(null)
    setEditingComponente(c)
    setSheetOpen(true)
  }

  function handleOpenNew() {
    setEditingComponente(null)
    setSheetOpen(true)
  }

  function handleCloseSheet() {
    setSheetOpen(false)
    setEditingComponente(null)
  }

  async function handleDeleteComponente() {
    if (!editingComponente) return
    const action = await deleteComponente(editingComponente.id)
    handleCloseSheet()
    // Se for inativação, abre modal informativo para feedback
    setPendingDeleteId(editingComponente.id)
    setDeleteModal(action === 'inativado' ? 'inativar-componente' : 'excluir-componente')
  }

  async function handleConfirmModal() {
    setDeleteModal(null)
    setPendingDeleteId(null)
  }

  async function handleReativar(id: string) {
    await reativarComponente(id)
  }

  function tiposNomes(ids: string[]) {
    return ids
      .map(id => METADATA_MOCK_TIPOS.find(t => t.id === id)?.nome ?? id)
      .join(', ')
  }

  const hasInativos = componentes.some(c => c.status === 'Inativo')

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="bg-white shrink-0">
        <div className="flex items-center justify-between px-8 py-4 h-[72px]">
          <h1 className="text-2xl font-bold text-[#030712]">Componentes</h1>
          <div className="flex items-center gap-2">
            {hasInativos && (
              <button
                onClick={() => setShowInativos(v => !v)}
                className={`h-9 px-3 rounded-md text-sm font-medium border transition-colors ${
                  showInativos
                    ? 'bg-gray-100 border-gray-300 text-[#030712]'
                    : 'border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50'
                }`}
              >
                {showInativos ? 'Ocultar inativos' : 'Ver inativos'}
              </button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] opacity-50 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 pl-9 pr-8 w-[160px] border border-[#e5e7eb] rounded-md text-sm text-[#030712] placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar componente
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {loading ? (
          <p className="text-sm text-[#6b7280]">Carregando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onNew={handleOpenNew} />
        ) : (
          <div className="border border-[#e5e7eb] rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white border-b border-[#e5e7eb]">
                  <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Nome</th>
                  <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Descrição</th>
                  <th className="text-left px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Tipos de Licença</th>
                  <th className="text-center px-2 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Status</th>
                  {showInativos && <th className="px-2 py-2.5 h-10" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isInativo = c.status === 'Inativo'
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-[#e5e7eb] last:border-0 transition-colors ${isInativo ? 'opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                      onClick={() => !isInativo && handleOpenDetail(c)}
                    >
                      <td className="px-2 py-2 h-[52px]">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center shrink-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                            <Cpu className="w-4 h-4 text-[#6b7280]" />
                          </div>
                          <span className="text-sm font-medium text-[#030712]">{c.nome}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 h-[52px] text-sm text-[#030712] max-w-[200px] truncate">
                        {c.descricao || '—'}
                      </td>
                      <td className="px-2 py-2 h-[52px] text-sm text-[#030712] max-w-[300px] truncate">
                        {c.tiposLicenca.length === 0 ? (
                          <span className="text-[#9ca3af]">—</span>
                        ) : (
                          <span title={tiposNomes(c.tiposLicenca)}>
                            {c.tiposLicenca.length} tipo{c.tiposLicenca.length > 1 ? 's' : ''}{' '}
                            <span className="text-[#6b7280]">({tiposNomes(c.tiposLicenca)})</span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 h-[52px] text-center">
                        {isInativo
                          ? <Badge variant="secondary">Inativo</Badge>
                          : <Badge variant="success" showIcon>Ativo</Badge>
                        }
                      </td>
                      {showInativos && (
                        <td className="px-2 py-2 h-[52px] text-right">
                          {isInativo && (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); handleReativar(c.id) }}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                            >
                              Reativar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sheet de detalhe (leitura) */}
      <ComponenteDetailSheet
        open={!!detailComponente}
        onClose={() => setDetailComponente(null)}
        componente={detailComponente}
        onEdit={() => detailComponente && handleOpenEdit(detailComponente)}
      />

      {/* Sheet de criação/edição */}
      <ComponenteSheet
        open={sheetOpen}
        onClose={handleCloseSheet}
        onSave={handleSave}
        onDelete={editingComponente ? handleDeleteComponente : undefined}
        initialComponente={editingComponente ?? undefined}
      />

      {/* Modais de excluir/inativar componente */}
      <ConfirmDeleteModal
        open={deleteModal === 'excluir-componente'}
        onClose={() => setDeleteModal(null)}
        variant="excluir-componente"
        name={componentes.find(c => c.id === pendingDeleteId)?.nome ?? ''}
        onConfirm={handleConfirmModal}
      />
      <ConfirmDeleteModal
        open={deleteModal === 'inativar-componente'}
        onClose={() => setDeleteModal(null)}
        variant="inativar-componente"
        name={componentes.find(c => c.id === pendingDeleteId)?.nome ?? ''}
        onConfirm={handleConfirmModal}
      />
    </div>
  )
}

function EmptyState({ search, onNew }: { search: string; onNew: () => void }) {
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <FolderOpen className="w-8 h-8 text-[#9ca3af]" />
        <p className="text-sm font-medium text-[#030712]">Nenhum componente encontrado</p>
        <p className="text-xs text-[#6b7280]">Tente buscar por outro termo.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <FolderOpen className="w-8 h-8 text-[#9ca3af]" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-[#030712]">Nenhum componente encontrado</p>
        <p className="text-xs text-[#6b7280]">Adicione o primeiro componente para começar.</p>
      </div>
      <Button onClick={onNew}>
        <Plus className="w-4 h-4 mr-1.5" />
        Adicionar componente
      </Button>
    </div>
  )
}
