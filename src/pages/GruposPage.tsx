import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Ellipsis, BadgeCheck, Circle, FilePen, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import { NewGrupoSheet } from '@/components/NewGrupoSheet'
import { api } from '@/api/client'
import { useCanManageGroups } from '@/authz'
import type { Grupo } from '@/types'

export function GruposPage() {
  const navigate = useNavigate()
  // canManageGroups: account_admin ou org_admin from organization
  const canManageGroupsFlag = useCanManageGroups()
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewSheet, setShowNewSheet] = useState(false)

  useEffect(() => {
    api.getGrupos()
      .then(data => setGrupos(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredGrupos = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return grupos.filter(g =>
      g.nome.toLowerCase().includes(query) ||
      (g.descricao ?? '').toLowerCase().includes(query)
    )
  }, [grupos, searchQuery])

  async function handleCreate(data: Omit<Grupo, 'id' | 'createdAt' | 'qtdMembros'> & { membroIds?: string[] }) {
    const grupo = await api.createGrupo({
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toLocaleDateString('pt-BR'),
    })
    setGrupos(prev => [...prev, { ...grupo, qtdMembros: data.membroIds?.length ?? 0, qtdObjetos: 0 }])
    setShowNewSheet(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Excluir este grupo?')) return
    await api.deleteGrupo(id)
    setGrupos(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <h1 className="text-2xl font-bold leading-8 text-[#030712]">Grupos</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
            <Search className="w-4 h-4 text-gray-400 opacity-50" />
            <input
              type="text"
              placeholder="Buscar"
              className="w-28 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">×</button>
            )}
          </div>
          <Button onClick={() => setShowNewSheet(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo grupo
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="px-8 pt-6 pb-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[220px]">Grupos</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[260px]">Descrição</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[90px]">Usuários</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[120px]">Funcionalidades</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[120px]">Status</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td>
                </tr>
              ) : filteredGrupos.length > 0 ? (
                filteredGrupos.map(grupo => (
                  <tr
                    key={grupo.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/grupos/${grupo.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[#030712]">{grupo.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 truncate max-w-[260px]">{grupo.descricao ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-center text-[#030712]">{grupo.qtdMembros ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-center text-[#030712]">{grupo.qtdObjetos ?? 0}</td>
                    <td className="px-4 py-3 text-center">
                      {grupo.status === 'Ativo' ? (
                        <span className="inline-flex items-center gap-1 bg-green-200 text-green-700 text-xs font-semibold rounded-[2px] px-2 py-1">
                          <BadgeCheck className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-[2px] px-2 py-1">
                          <Circle className="w-3 h-3" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <Popover
                        content={
                          <div className="flex flex-col gap-1 min-w-[163px]">
                            <button
                              onClick={() => navigate(`/grupos/${grupo.id}`)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left"
                            >
                              <FilePen className="w-4 h-4 shrink-0" />
                              Gerenciar grupo
                            </button>
                            <button
                              onClick={e => handleDelete(grupo.id, e)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
                              Excluir grupo
                            </button>
                          </div>
                        }
                      >
                        <button className="p-2 hover:bg-gray-100 rounded-md transition-colors" title="Ações">
                          <Ellipsis className="w-4 h-4 text-gray-600" />
                        </button>
                      </Popover>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    {searchQuery ? 'Nenhum grupo encontrado' : 'Nenhum grupo criado ainda'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewGrupoSheet
        open={showNewSheet}
        onClose={() => setShowNewSheet(false)}
        onSave={handleCreate}
      />
    </div>
  )
}
