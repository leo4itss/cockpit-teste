import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
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
  const [showInativas, setShowInativas] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [deleteModal, setDeleteModal] = useState<'inativar' | null>(null)

  useEffect(() => {
    api.getOrganizations()
      .then(data => { setOrgs(data); setLoading(false) })
      .catch(() => {
        // API indisponível (ex: preview Vercel sem backend) — usa mock data
        setOrgs(mockOrgs)
        setLoading(false)
      })
  }, [])

  const filtered = orgs.filter(o => showInativas || o.status !== 'Inativo')

  async function handleDeleteOrg(org: Organization) {
    try {
      await api.updateOrganization(org.id, { ...org, status: 'Inativo' })
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: 'Inativo' } : o))
    } catch {
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: 'Inativo' } : o))
    }
    setDeleteModal(null)
    setDeleteTarget(null)
  }

  async function handleActivateOrg(org: Organization) {
    try {
      await api.updateOrganization(org.id, { ...org, status: 'Ativo' })
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: 'Ativo' } : o))
    } catch {
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, status: 'Ativo' } : o))
    }
  }

  async function handleCreate(data: Omit<Organization, 'id' | 'qtdContas' | 'qtdSolucoes' | 'qtdContratos' | 'contacts'>) {
    const local: Organization = {
      ...data,
      id: crypto.randomUUID(),
      qtdContas: 0,
      qtdSolucoes: 0,
      qtdContratos: 0,
      contacts: [],
    }
    try {
      const saved = await api.createOrganization(local)
      setOrgs(prev => [...prev, saved])
    } catch {
      setOrgs(prev => [...prev, local])
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between px-8 py-4">
        <h1 className="text-2xl font-bold leading-8 text-[#030712]">Organização</h1>
        <div className="flex items-center gap-2">
          {(() => {
            const hasInativas = orgs.some(o => o.status === 'Inativo')
            return (
              <label className={`flex items-center gap-2 ${hasInativas ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                <input
                  type="checkbox"
                  checked={showInativas && hasInativas}
                  onChange={e => hasInativas && setShowInativas(e.target.checked)}
                  disabled={!hasInativas}
                  className="w-4 h-4 rounded border border-[#e5e7eb] accent-[#2563eb] cursor-pointer"
                />
                <span className="text-sm font-medium text-[#030712] whitespace-nowrap">Exibir organizações inativadas</span>
              </label>
            )
          })()}
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
                      <Badge variant="success" showIcon>Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">{org.status}</Badge>
                    )}
                  </td>
                  <td className="px-2 py-3 w-10" onClick={e => e.stopPropagation()}>
                    {org.status === 'Inativo' ? (
                      <button
                        onClick={() => handleActivateOrg(org)}
                        className="p-1.5 rounded hover:bg-green-50 text-[#9ca3af] hover:text-green-600 transition-colors opacity-0 group-hover/row:opacity-100"
                        title="Ativar organização"
                      >
                        <Circle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => { setDeleteTarget(org); setDeleteModal('inativar') }}
                        className="p-1.5 rounded hover:bg-amber-50 text-[#9ca3af] hover:text-amber-600 transition-colors opacity-0 group-hover/row:opacity-100"
                        title="Inativar organização"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={deleteModal === 'inativar' && !!deleteTarget}
        onClose={() => { setDeleteModal(null); setDeleteTarget(null) }}
        variant="inativar-org"
        name={deleteTarget?.name ?? ''}
        onConfirm={() => deleteTarget && handleDeleteOrg(deleteTarget)}
      />
      <NewOrganizationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleCreate}
      />
    </div>
  )
}
