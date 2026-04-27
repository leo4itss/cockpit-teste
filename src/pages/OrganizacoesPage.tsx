import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, FolderOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { NewOrganizationSheet } from '@/components/NewOrganizationSheet'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { api } from '@/api/client'
import { organizations as mockOrgs } from '@/data/mock'
import { useCanCreateOrganization, useAuth, authzEngine } from '@/authz'
import type { Organization } from '@/types'

export function OrganizacoesPage() {
  const navigate = useNavigate()
  // Permissões FGA — criar/excluir org é exclusivo do platform_admin
  const canCreate = useCanCreateOrganization()
  // authz engine + contexto para cheques por linha (dentro do map)
  const { currentUser, relations } = useAuth()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [deleteModal, setDeleteModal] = useState<'org' | 'blocked' | null>(null)
  const [blockedInfo, setBlockedInfo] = useState<{ activeAccounts: number; activeContracts: number } | null>(null)

  useEffect(() => {
    api.getOrganizations()
      .then(data => { setOrgs(data); setLoading(false) })
      .catch(() => {
        // API indisponível (ex: preview Vercel sem backend) — usa mock data
        setOrgs(mockOrgs)
        setLoading(false)
      })
  }, [])

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.domain.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDeleteOrg(org: Organization) {
    try {
      await api.deleteOrganization(org.id)
      setOrgs(prev => prev.filter(o => o.id !== org.id))
      setDeleteModal(null)
      setDeleteTarget(null)
    } catch (_err: any) {
      // Tenta parsear erro 422 com dependências
      try {
        const res = await fetch(`/api/organizations/${org.id}`, { method: 'DELETE' })
        if (res.status === 422) {
          const body = await res.json()
          setBlockedInfo({ activeAccounts: body.activeAccounts, activeContracts: body.activeContracts })
          setDeleteModal('blocked')
        }
      } catch {
        // fallback silencioso
      }
    }
  }

  async function handleCreate(data: Omit<Organization, 'id' | 'qtdContas' | 'qtdSolucoes' | 'qtdContratos' | 'contacts'>) {
    const newOrg = await api.createOrganization({
      ...data,
      id: crypto.randomUUID(),
      qtdContas: 0,
      qtdSolucoes: 0,
      qtdContratos: 0,
      contacts: [],
    })
    setOrgs(prev => [...prev, newOrg])
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between px-8 py-4">
        <h1 className="text-2xl font-bold leading-8 text-[#030712]">Organização</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
            <Search className="w-4 h-4 text-gray-400 opacity-50" />
            <input
              type="text"
              placeholder="Buscar"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm bg-transparent outline-none text-[#030712] placeholder:text-[#6b7280] w-40"
            />
          </div>
          {/* canCreateOrganization: apenas platform_admin */}
          {canCreate && (
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Criar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <FolderOpen className="w-10 h-10 text-gray-300" />
          <p className="text-base font-medium text-gray-700">Nenhuma organização encontrada</p>
          <p className="text-sm text-gray-500 text-center">
            Ainda não há organizações cadastradas no sistema.<br />
            Crie uma nova organização para provisionar a conta.
          </p>
          {canCreate && (
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Criar organização
            </Button>
          )}
        </div>
      ) : (
        <div className="px-8 pt-6 pb-8">
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Doc tipo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Doc número</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Domínio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Setor atividade</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Qtd contas</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Qtd solução</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Qtd contratos</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">País</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cidade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Arquiteto PAS</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => {
                // Cheque por linha: canViewOrganization garante que a linha foi carregada;
                // canManageAccounts determina visibilidade do ícone de exclusão.
                const canManageThisOrg = authzEngine.canManageAccounts(currentUser.id, org.id, relations)
                return (
                <tr
                  key={org.id}
                  className="group/row border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors bg-white"
                  onClick={() => navigate(`/organizacoes/${org.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs shrink-0">
                        {org.name.charAt(0)}
                      </div>
                      {org.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{org.docType}</td>
                  <td className="px-4 py-3 text-gray-600">{org.docNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{org.domain}</td>
                  <td className="px-4 py-3 text-gray-600">{org.activitySector}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{org.qtdContas}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{org.qtdSolucoes}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{org.qtdContratos}</td>
                  <td className="px-4 py-3 text-gray-600">{org.country}</td>
                  <td className="px-4 py-3 text-gray-600">{org.state}</td>
                  <td className="px-4 py-3 text-gray-600">{org.city}</td>
                  <td className="px-4 py-3 text-gray-600">{org.arquitetoPAS.split(' ')[0]}...</td>
                  <td className="px-4 py-3">
                    <Badge variant={org.status === 'Ativo' ? 'success' : 'default'}>{org.status}</Badge>
                  </td>
                  <td className="px-2 py-3 w-10" onClick={e => e.stopPropagation()}>
                    <div className="relative group">
                      <button
                        onClick={() => { setDeleteTarget(org); setDeleteModal('org') }}
                        className="p-1.5 rounded hover:bg-red-50 text-[#9ca3af] hover:text-red-600 transition-colors opacity-0 group-hover/row:opacity-100"
                        title="Excluir organização"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={deleteModal === 'org' && !!deleteTarget}
        onClose={() => { setDeleteModal(null); setDeleteTarget(null) }}
        variant="org"
        name={deleteTarget?.name ?? ''}
        onConfirm={() => deleteTarget && handleDeleteOrg(deleteTarget)}
      />
      <ConfirmDeleteModal
        open={deleteModal === 'blocked'}
        onClose={() => { setDeleteModal(null); setDeleteTarget(null) }}
        variant="blocked"
        name={deleteTarget?.name ?? ''}
        blocked={blockedInfo ?? undefined}
      />
      <NewOrganizationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleCreate}
      />
    </div>
  )
}
