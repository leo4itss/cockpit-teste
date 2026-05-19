import { useState, useEffect, useRef } from 'react'
import { Search, Plus, FolderOpen, Cpu, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ComponenteSheet, METADATA_MOCK_TIPOS } from '@/components/ComponenteSheet'
import { ComponenteDetailSheet } from '@/components/ComponenteDetailSheet'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { useToast, ToastContainer } from '@/components/ui/Toast'
import { useComponentes } from '@/context/ComponentesContext'
import { useIsPlatformAdmin, useIsPasArchitect } from '@/authz/hooks'
import { api } from '@/api/client'
import type { Componente } from '@/types'

export function ComponentesPage() {
  const { componentes, loading, error, addComponente, updateComponente, deleteComponente, reativarComponente } = useComponentes()
  const { toasts, toast, dismiss } = useToast()
  const isPlatformAdmin = useIsPlatformAdmin()
  const isPasArchitect  = useIsPasArchitect()
  const canCreate = isPlatformAdmin || isPasArchitect
  const [search, setSearch] = useState('')

  // Toast: erro de carregamento (node 1)
  useEffect(() => {
    if (error) {
      toast('Não foi possível carregar os componentes.\nTente novamente em alguns instantes.', 'error')
    }
  }, [error]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sheet de detalhe (leitura)
  const [detailComponente, setDetailComponente] = useState<Componente | null>(null)

  // Sheet de edição/criação
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingComponente, setEditingComponente] = useState<Componente | null>(null)

  // Modais de delete/inativar
  const [deleteModal, setDeleteModal] = useState<'excluir-componente' | 'inativar-componente' | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Status de vínculo do componente sendo editado (pré-carregado ao abrir o sheet)
  const [editingIsLinked, setEditingIsLinked] = useState<boolean | null>(null)

  // Mostra ativos por padrão; toggle para ver inativos também
  const [showInativos, setShowInativos] = useState(false)

  const filtered = componentes
    .filter(c => showInativos || c.status !== 'Inativo')
    .filter(c =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.descricao ?? '').toLowerCase().includes(search.toLowerCase())
    )

  // Toast: busca sem resultados (node 13)
  const lastEmptySearchRef = useRef('')
  useEffect(() => {
    if (search && filtered.length === 0 && lastEmptySearchRef.current !== search) {
      lastEmptySearchRef.current = search
      toast('Nenhuma componente encontrado para esta busca.\nVerifique o termo pesquisado.', 'warning')
    }
    if (!search || filtered.length > 0) {
      lastEmptySearchRef.current = ''
    }
  }, [search, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(data: Omit<Componente, 'id' | 'createdAt'>) {
    try {
      if (editingComponente) {
        await updateComponente(editingComponente.id, data)
        toast('Componentes atualizada com sucesso.', 'success')
      } else {
        await addComponente(data)
        toast('Componente criada com sucesso.', 'success')
      }
    } catch {
      if (editingComponente) {
        toast('Não foi possível salvar as alterações.\nTente novamente.', 'error')
      } else {
        toast('Não foi possível criar a componente.\nRevise os dados e tente novamente.', 'error')
      }
    }
  }

  function handleOpenDetail(c: Componente) {
    setDetailComponente(c)
  }

  async function handleOpenEdit(c: Componente) {
    setDetailComponente(null)
    setEditingComponente(c)
    setEditingIsLinked(null) // desconhecido enquanto carrega
    setSheetOpen(true)
    // Pré-carrega status de vínculo para exibir botão correto no sheet
    try {
      const { linked } = await api.checkComponenteLinked(c.id)
      setEditingIsLinked(linked)
    } catch {
      setEditingIsLinked(null)
    }
  }

  function handleOpenNew() {
    setEditingComponente(null)
    setSheetOpen(true)
  }

  function handleCloseSheet() {
    setSheetOpen(false)
    setEditingComponente(null)
    setEditingIsLinked(null)
  }

  // Clique no botão "Excluir componente" do sheet:
  // 1. Verifica vínculos via API antes de qualquer ação
  // 2. Mostra o modal correto (excluir ou inativar)
  // 3. Só age na confirmação do modal
  async function handleDeleteComponente() {
    if (!editingComponente) return
    const id = editingComponente.id

    // Fecha o sheet e guarda o ID pendente
    handleCloseSheet()
    setPendingDeleteId(id)

    // Checa vínculos via endpoint dedicado — fallback SEGURO: se a verificação falhar,
    // assume que há vínculos (inativar) para nunca excluir por engano
    try {
      const { linked } = await api.checkComponenteLinked(id)
      setDeleteModal(linked ? 'inativar-componente' : 'excluir-componente')
    } catch {
      // Falha na verificação → opção segura: inativar
      setDeleteModal('inativar-componente')
    }
  }

  async function handleConfirmModal() {
    if (!pendingDeleteId) return
    const isInativar = deleteModal === 'inativar-componente'
    try {
      await deleteComponente(pendingDeleteId)
      if (isInativar) {
        toast('Componente inativada com sucesso.', 'success')
      } else {
        toast('Componente excluído com sucesso.', 'success')
      }
    } catch {
      if (isInativar) {
        toast('Não foi possível inativar o componente.\nTente novamente.', 'error')
      } else {
        toast('Não foi possível excluir o componente.\nTente novamente.', 'error')
      }
    }
    setDeleteModal(null)
    setPendingDeleteId(null)
  }

  function handleCloseModal() {
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
        <div className="flex items-start justify-between px-8 py-4 gap-6">
          {/* Título + descrição */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">Escopo: Plataforma</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-600 border border-purple-200">Platform Admin</span>
            </div>
            <h1 className="text-2xl font-bold leading-8 text-[#030712]">Componentes</h1>
            <p className="text-sm text-[#6b7280] mt-1 max-w-[1080px]">
              Módulos e serviços que compõem as Soluções PAS. Cada componente define quais permissões granulares (<code className="text-xs bg-gray-100 px-1 rounded">can_use_assistant</code>, <code className="text-xs bg-gray-100 px-1 rounded">pode_ler</code>…) podem ser atribuídas a usuários e grupos via <strong className="font-medium text-[#374151]">Acessos</strong>.
            </p>
          </div>
          {/* Controles */}
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <label className={`flex items-center gap-2 ${hasInativos ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
              <input
                type="checkbox"
                checked={showInativos && hasInativos}
                onChange={e => hasInativos && setShowInativos(e.target.checked)}
                disabled={!hasInativos}
                className="w-4 h-4 rounded border border-[#e5e7eb] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] shrink-0 accent-[#2563eb] cursor-pointer"
              />
              <span className="text-sm font-medium text-[#030712] leading-none">Exibir componentes inativados</span>
            </label>
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
            {canCreate && (
              <Button onClick={handleOpenNew}>
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar componente
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {loading ? (
          <p className="text-sm text-[#6b7280]">Carregando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onNew={canCreate ? handleOpenNew : undefined} />
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
                          ? <Badge variant="secondary" showIcon>Inativo</Badge>
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
        isLinked={editingIsLinked}
        initialComponente={editingComponente ?? undefined}
      />

      {/* Modais de excluir/inativar componente */}
      <ConfirmDeleteModal
        open={deleteModal === 'excluir-componente'}
        onClose={handleCloseModal}
        variant="excluir-componente"
        name={componentes.find(c => c.id === pendingDeleteId)?.nome ?? ''}
        onConfirm={handleConfirmModal}
      />
      <ConfirmDeleteModal
        open={deleteModal === 'inativar-componente'}
        onClose={handleCloseModal}
        variant="inativar-componente"
        name={componentes.find(c => c.id === pendingDeleteId)?.nome ?? ''}
        onConfirm={handleConfirmModal}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

function EmptyState({ search, onNew }: { search: string; onNew?: () => void }) {
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
        <p className="text-xs text-[#6b7280]">
          {onNew ? 'Adicione o primeiro componente para começar.' : 'Nenhum componente cadastrado ainda.'}
        </p>
      </div>
      {onNew && (
        <Button onClick={onNew}>
          <Plus className="w-4 h-4 mr-1.5" />
          Adicionar componente
        </Button>
      )}
    </div>
  )
}
