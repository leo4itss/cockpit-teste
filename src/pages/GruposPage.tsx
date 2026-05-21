import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Ellipsis, Eye, Trash2, Building2, Building } from 'lucide-react'
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

function PapelBadge({ papel }: { papel?: string }) {
  if (!papel) return <span className="text-xs text-gray-400">—</span>
  const variants: Record<string, string> = {
    'Viewer': 'bg-gray-100 text-gray-600 border-gray-200',
    'User':   'bg-blue-50 text-blue-700 border-blue-200',
    'Admin':  'bg-orange-50 text-orange-700 border-orange-200',
  }
  const cls = variants[papel] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {papel}
    </span>
  )
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
  const [orgs,   setOrgs]     = useState<any[]>([])
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
      api.getOrganizations(),
    ]).then(([fetchedGrupos, fetchedContas, fetchedOrgs]) => {
      setGrupos(fetchedGrupos)
      setContas(fetchedContas)
      setOrgs(fetchedOrgs)
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

  // Deriva nome da org ou conta para exibição contextual
  function getContexto(grupo: Grupo): { label: string; nome: string } | null {
    if (grupo.escopo === 'conta' && grupo.accountId) {
      const conta = contas.find(c => c.id === grupo.accountId)
      return conta ? { label: 'Conta', nome: conta.name } : null
    }
    if (grupo.escopo === 'org' && grupo.orgId) {
      const org = orgs.find(o => o.id === grupo.orgId)
      return org ? { label: 'Org', nome: org.name } : null
    }
    return null
  }

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
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">Escopo: Organização</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">Org Admin</span>
          </div>
          <h1 className="text-2xl font-bold leading-8 text-[#030712]">Grupos</h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-[1080px]">
            Gerencie grupos de acesso da organização. Grupos com escopo{' '}
            <strong className="font-medium text-[#374151]">Organização</strong> são criados aqui e ficam disponíveis em todas as contas.
            Grupos com escopo <strong className="font-medium text-[#374151]">Conta</strong> são criados pelo Account Admin dentro de cada conta, em <strong className="font-medium text-[#374151]">Acessos</strong>.
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
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[110px]">Papel</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 w-[130px]">Escopo</th>
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
                    {/* Nome + descrição + contexto org/conta */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#030712]">{grupo.nome}</p>
                      {grupo.descricao && (
                        <p className="text-xs text-[#6b7280] mt-0.5 max-w-sm truncate">{grupo.descricao}</p>
                      )}
                      {(() => {
                        const ctx = getContexto(grupo)
                        if (!ctx) return null
                        const isOrg = grupo.escopo === 'org'
                        return (
                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-[#9ca3af]">
                            {isOrg
                              ? <Building  className="w-2.5 h-2.5 shrink-0" />
                              : <Building2 className="w-2.5 h-2.5 shrink-0" />}
                            {ctx.nome}
                          </span>
                        )
                      })()}
                    </td>

                    {/* Membros */}
                    <td className="px-4 py-3 text-sm text-[#030712]">
                      {grupo.qtdMembros ?? 0}
                    </td>

                    {/* Papel */}
                    <td className="px-4 py-3">
                      <PapelBadge papel={grupo.papel} />
                    </td>

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
        orgs={orgs}
        contas={contas}
        isPlatformAdmin={isPlatformAdmin}
        onSuccess={grupo => setGrupos(prev => [...prev, grupo])}
      />

      <GrupoDetailSheet
        open={showDetail}
        onClose={() => setShowDetail(false)}
        grupo={selectedGrupo}
        accountId={selectedGrupo?.accountId ?? ''}
        accountNome={selectedGrupo ? (getContexto(selectedGrupo)?.nome ?? undefined) : undefined}
        contextoLabel={selectedGrupo ? (getContexto(selectedGrupo)?.label ?? undefined) : undefined}
      />
    </div>
  )
}
