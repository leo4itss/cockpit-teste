import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Ellipsis, Info, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Popover } from '@/components/ui/Popover'
import { CriarGrupoOrgSheet } from '@/components/grupos/CriarGrupoOrgSheet'
import { GrupoDetailSheet } from '@/components/grupos/GrupoDetailSheet'
import { api } from '@/api/client'
import { useAuthz, useIsPlatformAdmin, useIsOrgAdmin, useIsAccountAdmin } from '@/authz/hooks'
import type { Account, Grupo } from '@/types'

// ── Badge de escopo ───────────────────────────────────────────

function EscopoBadge({ escopo }: { escopo: 'org' | 'conta' }) {
  return escopo === 'org'
    ? <Badge variant="info">Organização</Badge>
    : <Badge variant="default" className="bg-violet-50 text-violet-700 border border-violet-200">Conta</Badge>
}

// ── Página ────────────────────────────────────────────────────

export function GruposPage() {
  const { currentUser, relations } = useAuthz()
  const isPlatformAdmin = useIsPlatformAdmin()
  const isOrgAdmin      = useIsOrgAdmin()
  const isAccountAdmin  = useIsAccountAdmin()
  const adminOrgId = relations.orgAdmins.find(a => a.userId === currentUser.id)?.orgId ?? '1'

  const [grupos, setGrupos]   = useState<Grupo[]>([])
  const [contas, setContas]   = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const [showCriar, setShowCriar]         = useState(false)
  const [showDetail, setShowDetail]       = useState(false)
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null)

  // Platform Admin vê todos os grupos (sem filtro de org); os demais filtram pela sua org.
  const queryOrgId = isPlatformAdmin ? undefined : adminOrgId

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getGrupos(queryOrgId ? { orgId: queryOrgId } : undefined),
      api.getAccounts(queryOrgId),
    ]).then(([fetchedGrupos, fetchedContas]) => {
      setGrupos(fetchedGrupos)
      setContas(fetchedContas)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [queryOrgId])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return grupos.filter(g =>
      g.nome.toLowerCase().includes(q) ||
      (g.descricao ?? '').toLowerCase().includes(q)
    )
  }, [grupos, search])

  function handleRowClick(grupo: Grupo) {
    setSelectedGrupo(grupo)
    setShowDetail(true)
  }

  async function handleDelete(grupo: Grupo) {
    if (!confirm(`Excluir o grupo "${grupo.nome}"? Esta ação não pode ser desfeita.`)) return
    try { await api.deleteGrupo(grupo.id) } catch { /* silencioso */ }
    setGrupos(p => p.filter(g => g.id !== grupo.id))
  }

  // ── Render ────────────────────────────────────────────────

  if (!isPlatformAdmin && !isOrgAdmin && !isAccountAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-2">
        <p className="text-sm font-medium text-gray-600">Acesso restrito</p>
        <p className="text-xs text-gray-400">Esta página está disponível apenas para Platform Admin, Org Admin e Account Admin.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between px-8 py-4 gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-8 text-[#030712]">Grupos</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Organize usuários em grupos para atribuir permissões em conjunto. Grupos com escopo{' '}
            <strong className="font-medium text-[#374151]">Organização</strong> ficam disponíveis em todas as contas;
            grupos com escopo <strong className="font-medium text-[#374151]">Conta</strong> são restritos a uma conta específica.
          </p>
        </div>
        <Button onClick={() => setShowCriar(true)} className="shrink-0 mt-1">
          <Plus className="w-4 h-4 mr-1.5" />
          Criar grupo
        </Button>
      </div>

      <div className="px-8 pb-8 space-y-4">

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="Buscar por nome ou descrição"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 leading-none">×</button>
            )}
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[260px]">Grupo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[100px]">Membros</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[140px]">
                  <span className="flex items-center gap-1">
                    Componentes
                    <Info className="w-3 h-3 opacity-60" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[140px]">Escopo</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(grupo => (
                  <tr
                    key={grupo.id}
                    className="group border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer last:border-b-0"
                    onClick={() => handleRowClick(grupo)}
                  >
                    {/* Nome + descrição */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#030712]">{grupo.nome}</p>
                      {grupo.descricao && (
                        <p className="text-xs text-[#6b7280] mt-0.5 max-w-sm truncate">{grupo.descricao}</p>
                      )}
                    </td>

                    {/* Membros */}
                    <td className="px-4 py-3 text-sm text-[#030712]">
                      {grupo.qtdMembros ?? 0}
                    </td>

                    {/* Componentes — placeholder até integração */}
                    <td className="px-4 py-3 text-sm text-[#6b7280]">—</td>

                    {/* Escopo */}
                    <td className="px-4 py-3">
                      <EscopoBadge escopo={grupo.escopo} />
                    </td>

                    {/* Ações — visíveis só no hover */}
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="invisible group-hover:visible">
                        <Popover
                          content={
                            <div className="flex flex-col gap-1 min-w-[160px]">
                              <button
                                onClick={() => handleRowClick(grupo)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left"
                              >
                                <Eye className="w-4 h-4 shrink-0" />
                                Ver detalhes
                              </button>
                              <button
                                onClick={() => handleDelete(grupo)}
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
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-[#030712]">Nenhum grupo encontrado</p>
                    <p className="text-xs text-[#6b7280] mt-1">
                      {search
                        ? 'Ajuste a busca ou crie um novo grupo.'
                        : 'Crie um grupo para organizar usuários e aplicar permissões em conjunto.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sheets */}
      <CriarGrupoOrgSheet
        open={showCriar}
        onClose={() => setShowCriar(false)}
        orgId={adminOrgId}
        contas={contas}
        onSuccess={grupo => setGrupos(prev => [...prev, grupo])}
      />

      <GrupoDetailSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        grupo={selectedGrupo}
        accountId={selectedGrupo?.accountId ?? ''}
      />
    </div>
  )
}
