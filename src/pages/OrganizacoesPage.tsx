import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Plus, FolderOpen, Trash2, Circle, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { NewOrganizationSheet } from '@/components/NewOrganizationSheet'
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal'
import { api } from '@/api/client'
import { useIsPlatformAdmin, useIsOrgAdmin, useIsAccountAdmin, useIsPasArchitect, useAdminOrgId } from '@/authz/hooks'
import { organizations as mockOrgs } from '@/data/mock'
import type { Organization } from '@/types'

export function OrganizacoesPage() {
  const navigate = useNavigate()
  const isPlatformAdmin = useIsPlatformAdmin()
  const isOrgAdmin = useIsOrgAdmin()
  const isPasArchitect = useIsPasArchitect()
  const isAccountAdmin = useIsAccountAdmin()
  const adminOrgId = useAdminOrgId()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const [showInativas, setShowInativas] = useState(false)
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [deleteModal, setDeleteModal] = useState<'inativar' | null>(null)

  // Account Admin não tem acesso à página de Organizações
  // (só gerencia sua própria conta — usa a aba Acessos)
  const isAccountAdminOnly = isAccountAdmin && !isPlatformAdmin && !isOrgAdmin && !isPasArchitect

  useEffect(() => {
    api.getOrganizations()
      .then(data => { setOrgs(data); setLoading(false) })
      .catch(() => {
        // API indisponível (ex: preview Vercel sem backend) — usa mock data
        setOrgs(mockOrgs)
        setLoading(false)
      })
  }, [])

  if (isAccountAdminOnly) {
    return <Navigate to="/acessos" replace />
  }

  const filtered = orgs
    .filter(o => isPlatformAdmin || !isOrgAdmin || !adminOrgId || o.id === adminOrgId)
    .filter(o => showInativas || o.status !== 'Inativo')
    .filter(o =>
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.domain ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.activitySector ?? '').toLowerCase().includes(search.toLowerCase())
    )

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
      <div className="flex items-start justify-between px-8 py-4 gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isPlatformAdmin ? (
              <>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">Escopo: Plataforma</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-600 border border-purple-200">Platform Admin</span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200">Escopo: Organização</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">Org Admin</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-8 text-[#030712]">Organizações</h1>
          <p className="text-sm text-[#6b7280] mt-1 max-w-[1080px]">
            {isPlatformAdmin
              ? 'Cadastre e gerencie as organizações clientes da plataforma PAS. Cada organização pode ter múltiplas contas, soluções e contratos vinculados.'
              : 'Visualize e gerencie os dados da sua organização.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {isPlatformAdmin && (() => {
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
          {isPlatformAdmin && (
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Criar Organização
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
          {search ? (
            <p className="text-sm text-gray-500 text-center">Tente buscar por outro termo.</p>
          ) : (
            <>
              <p className="text-sm text-gray-500 text-center">
                Ainda não há organizações cadastradas no sistema.<br />
                Crie uma nova organização para provisionar a conta.
              </p>
              {isPlatformAdmin && (
                <Button onClick={() => setSheetOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Criar organização
                </Button>
              )}
            </>
          )}
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
                  className="group/row border-b border-[#e5e7eb] last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
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
                      <Badge variant="secondary" showIcon>{org.status}</Badge>
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
