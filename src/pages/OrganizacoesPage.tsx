import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, FolderOpen, Trash2, CircleCheck, Circle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NewOrganizationSheet } from '@/components/NewOrganizationSheet'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { api } from '@/api/client'
import { organizations as mockOrgs } from '@/data/mock'
import type { Organization } from '@/types'

export function OrganizacoesPage() {
  const navigate = useNavigate()
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
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Criar Organização
          </Button>
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
          <Button onClick={() => setSheetOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Criar organização
          </Button>
        </div>
      ) : (
        <div className="px-8 pt-6 pb-8">
        <div className="border border-[#e5e7eb] rounded-2xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#e5e7eb] bg-white">
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Nome</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Doc tipo</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Doc número</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Domínio</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Setor atividade</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">País</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Estado</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Cidade</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Arquiteto PAS</th>
                <th className="text-left px-4 py-2.5 text-sm font-medium text-[#030712] opacity-40 h-10">Status</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className="group/row border-b border-[#e5e7eb] last:border-0 hover:bg-gray-50 cursor-pointer transition-colors bg-white"
                  onClick={() => navigate(`/organizacoes/${org.id}`)}
                >
                  <td className="px-4 py-3 h-[52px]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center text-xs font-semibold text-[#6b7280] shrink-0">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-[#030712]">{org.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#030712]">{org.docType}</td>
                  <td className="px-4 py-3 text-sm text-[#030712]">{org.docNumber}</td>
                  <td className="px-4 py-3 text-sm text-[#030712]">{org.domain}</td>
                  <td className="px-4 py-3 text-sm text-[#030712]">{org.activitySector}</td>
                  <td className="px-4 py-3 text-sm text-[#030712]">{org.country}</td>
                  <td className="px-4 py-3 text-sm text-[#030712]">{org.state}</td>
                  <td className="px-4 py-3 text-sm text-[#030712]">{org.city}</td>
                  <td className="px-4 py-3 text-sm text-[#030712]">{org.arquitetoPAS}</td>
                  <td className="px-4 py-3">
                    {org.status === 'Ativo' ? (
                      <span className="inline-flex items-center gap-1 bg-[#dcfce7] text-[#16a34a] text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                        <CircleCheck className="w-3 h-3" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                        <Circle className="w-3 h-3" />
                        {org.status}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3 w-10" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setDeleteTarget(org); setDeleteModal('org') }}
                      className="p-1.5 rounded hover:bg-red-50 text-[#9ca3af] hover:text-red-600 transition-colors opacity-0 group-hover/row:opacity-100"
                      title="Excluir organização"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
