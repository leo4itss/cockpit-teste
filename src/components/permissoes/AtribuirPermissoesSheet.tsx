import { useState, useEffect, useMemo } from 'react'
import { Search, Bot, Database, Layers, Users } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Button } from '@/components/ui/Button'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import type { Componente } from '@/types'

// ── Tipos ──────────────────────────────────────────────────────

type ComponenteTipo = 'assistente-ia' | 'base-conhecimento' | 'default'

interface AcaoItem { acao: string; label: string }

const ACOES: Record<ComponenteTipo, AcaoItem[]> = {
  'assistente-ia': [
    { acao: 'can_use_assistant',             label: 'Usar o assistente' },
    { acao: 'can_view_consulted_sources',    label: 'Visualizar fontes consultadas' },
    { acao: 'can_upload_rag_sources',        label: 'Upload de fontes RAG' },
    { acao: 'can_configure_agents',          label: 'Configurar agentes' },
    { acao: 'can_manage_business_scenarios', label: 'Gerenciar cenários de negócio' },
    { acao: 'can_manage_users',              label: 'Gerenciar usuários' },
  ],
  'base-conhecimento': [
    { acao: 'pode_ler',                   label: 'Ler documentos' },
    { acao: 'pode_editar',                label: 'Editar conteúdo' },
    { acao: 'pode_criar_documento',       label: 'Criar documentos' },
    { acao: 'pode_enviar_para_aprovacao', label: 'Enviar para aprovação' },
    { acao: 'pode_aprovar',               label: 'Aprovar documentos' },
    { acao: 'pode_publicar',              label: 'Publicar documentos' },
    { acao: 'pode_excluir',               label: 'Excluir' },
  ],
  'default': [
    { acao: 'can_view',   label: 'Visualizar' },
    { acao: 'can_edit',   label: 'Editar' },
    { acao: 'can_manage', label: 'Administrar' },
  ],
}

interface Props {
  open:        boolean
  onClose:     () => void
  entityType:  'usuario' | 'grupo'
  entityId:    string
  entityNome:  string
  accountId:   string
  accountNome?: string
  onSuccess?:  () => void
}

// ── Helpers ────────────────────────────────────────────────────

function inferirTipo(nome: string): ComponenteTipo {
  const n = nome.toLowerCase()
  if (n.includes('assistente') || n.includes('pas core') || n.includes('analytics')) return 'assistente-ia'
  if (n.includes('base') || n.includes('knowledge') || n.includes('kb') || n.includes('jurídic')) return 'base-conhecimento'
  return 'default'
}

function ComponenteIcon({ tipo }: { tipo: ComponenteTipo }) {
  if (tipo === 'assistente-ia')     return <Bot      className="w-5 h-5 text-violet-500 shrink-0" />
  if (tipo === 'base-conhecimento') return <Database className="w-5 h-5 text-blue-500 shrink-0" />
  return                                   <Layers   className="w-5 h-5 text-gray-400 shrink-0" />
}

// ── Componente principal ───────────────────────────────────────

export function AtribuirPermissoesSheet({
  open, onClose, entityType, entityId, entityNome, accountId, accountNome, onSuccess,
}: Props) {
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)

  // componenteId → string[] de ações ativas
  const [original, setOriginal] = useState<Record<string, string[]>>({})
  const [draft, setDraft]       = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSearch('')

    const entidadeTipo = entityType === 'usuario' ? 'user' : 'group'

    // Componentes e permissões são independentes: falha em permissões não bloqueia
    // a listagem de componentes — a sheet abre sem marcações e o usuário pode salvar.
    api.getComponentes()
      .then((comps: Componente[]) => {
        const ativos = comps.filter((c: Componente) => c.status !== 'Inativo')
        setComponentes(ativos)

        const emptyMap: Record<string, string[]> = {}
        ativos.forEach((c: Componente) => { emptyMap[c.id] = [] })

        // Tenta carregar permissões existentes; se falhar, abre com tudo desmarcado
        api.getPermissions({ entidade_tipo: entidadeTipo, entidade_id: entityId })
          .then((perms: any[]) => {
            const permMap: Record<string, string[]> = { ...emptyMap }
            // Drizzle retorna camelCase: componenteId (não componente_id)
            perms.forEach((p: any) => {
              const cid = p.componenteId ?? p.componente_id
              if (cid !== undefined && permMap[cid] !== undefined) {
                permMap[cid] = [...permMap[cid], p.acao]
              }
            })
            setOriginal(permMap)
            setDraft(JSON.parse(JSON.stringify(permMap)))
          })
          .catch(() => {
            setOriginal(emptyMap)
            setDraft(JSON.parse(JSON.stringify(emptyMap)))
          })
          .finally(() => setLoading(false))
      })
      .catch(() => setLoading(false))
  }, [open, entityId, entityType])

  const filtered = useMemo(() => {
    if (!search.trim()) return componentes
    const q = search.toLowerCase()
    return componentes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.descricao ?? '').toLowerCase().includes(q)
    )
  }, [componentes, search])

  function toggle(componenteId: string, acao: string) {
    setDraft(prev => {
      const current = prev[componenteId] ?? []
      const next = current.includes(acao)
        ? current.filter(a => a !== acao)
        : [...current, acao]
      return { ...prev, [componenteId]: next }
    })
  }

  const hasChanges = componentes.some(c => {
    const orig = new Set(original[c.id] ?? [])
    const draftAcoes = draft[c.id] ?? []
    if (draftAcoes.length !== orig.size) return true
    return draftAcoes.some(a => !orig.has(a))
  })

  const totalAcoes = Object.values(draft).reduce((acc, v) => acc + v.length, 0)

  async function handleSalvar() {
    setSaving(true)
    setSaveError(null)
    const entidadeTipo = entityType === 'usuario' ? 'user' : 'group'
    try {
      for (const comp of componentes) {
        const orig       = new Set(original[comp.id] ?? [])
        const draftAcoes = draft[comp.id] ?? []

        for (const acao of draftAcoes) {
          if (!orig.has(acao)) {
            await api.addPermission({
              entidade_tipo: entidadeTipo,
              entidade_id:   entityId,
              componente_id: comp.id,
              acao,
            })
          }
        }
        for (const acao of orig) {
          if (!draftAcoes.includes(acao)) {
            await api.removePermission({
              entidade_tipo: entidadeTipo,
              entidade_id:   entityId,
              componente_id: comp.id,
              acao,
            })
          }
        }
      }
      onSuccess?.()
      handleClose()
    } catch (err: any) {
      setSaveError(err?.message ?? 'Erro ao salvar permissões. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setSearch(''); setOriginal({}); setDraft({}); setComponentes([]); setSaveError(null)
    onClose()
  }

  const contaNome = accountNome ?? accountId
  const isGrupo   = entityType === 'grupo'

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[560px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Atribuir permissões — {entityNome}</NestedSheetTitle>
        <NestedSheetDescription>
          Selecione as ações permitidas em cada componente disponível na conta <strong>{contaNome}</strong>.
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody noPadding>
        <div className="flex flex-col h-full">

          {/* Banner grupo */}
          {isGrupo && (
            <div className="flex items-start gap-3 mx-6 mt-5 p-3.5 rounded-xl border border-violet-200 bg-violet-50">
              <Users className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
              <p className="text-sm text-violet-800">
                Você está atribuindo permissões ao <strong>grupo {entityNome}</strong>.
                Todos os membros herdarão estas permissões automaticamente.
              </p>
            </div>
          )}

          {/* Busca */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar componente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 leading-none text-base">×</button>
              )}
            </div>
          </div>

          {/* Lista de componentes com checkboxes */}
          <div className="flex-1 overflow-y-auto border-t border-gray-100">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">Carregando componentes...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-1">
                <p className="text-sm font-medium text-[#030712]">Nenhum componente encontrado</p>
                <p className="text-xs text-[#6b7280]">Tente outro termo de busca.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(comp => {
                  const tipo   = inferirTipo(comp.nome)
                  const acoes  = ACOES[tipo]
                  const ativas = draft[comp.id] ?? []

                  return (
                    <div key={comp.id} className="px-6 py-4">
                      {/* Header do componente */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="mt-0.5"><ComponenteIcon tipo={tipo} /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#030712] leading-5">{comp.nome}</p>
                          {comp.descricao && (
                            <p className="text-xs text-[#6b7280] leading-4 mt-0.5 truncate max-w-sm">{comp.descricao}</p>
                          )}
                        </div>
                        {ativas.length > 0 && (
                          <span className="ml-auto shrink-0 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                            {ativas.length}/{acoes.length}
                          </span>
                        )}
                      </div>

                      {/* Checkboxes */}
                      <div className="grid grid-cols-1 gap-1 pl-8">
                        {acoes.map(({ acao, label }) => {
                          const checked = ativas.includes(acao)
                          return (
                            <label
                              key={acao}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors',
                                'hover:bg-gray-50',
                                checked && 'bg-blue-50/60 hover:bg-blue-50',
                                saving && 'pointer-events-none opacity-60',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(comp.id, acao)}
                                disabled={saving}
                                className={cn(
                                  'w-4 h-4 rounded border-gray-300 cursor-pointer',
                                  'accent-blue-600',
                                )}
                              />
                              <span className={cn(
                                'text-sm',
                                checked ? 'text-[#030712] font-medium' : 'text-[#374151]',
                              )}>
                                {label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Contador */}
          {totalAcoes > 0 && (
            <div className="px-6 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-[#6b7280]">
                <strong className="text-[#030712]">{totalAcoes}</strong>{' '}
                {totalAcoes === 1 ? 'permissão ativa' : 'permissões ativas'}
              </p>
            </div>
          )}
        </div>
      </NestedSheetBody>

      <NestedSheetFooter>
        {saveError && (
          <p className="text-xs text-red-600 flex-1 mr-2">{saveError}</p>
        )}
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSalvar} disabled={!hasChanges || saving}>
          {saving ? 'Salvando...' : 'Salvar permissões'}
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
