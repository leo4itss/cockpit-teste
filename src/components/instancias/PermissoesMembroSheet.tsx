/**
 * PermissoesMembroSheet — painel unificado de permissões por membro.
 *
 * FGA:      radio Visualizador / Membro / Administrador + checkboxes de ações (pré-selecionadas por papel).
 *           Quando o papel muda, as ações são atualizadas com os defaults do novo papel.
 * DocNix usuário: abas "Diretas" (checkboxes editáveis + via grupo read-only) | "Efetivo" (resultado calculado com origem).
 * DocNix grupo:   aba "Diretas" (checkboxes editáveis) + info de herança.
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, Users, Lock, Loader2 } from 'lucide-react'
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
import type { Atribuicao, InstanciaMembro } from '@/types'

// ── FGA: catálogo de ações por tipo de componente ─────────────

type ComponenteTipoFGA = 'assistente-ia' | 'base-conhecimento' | 'analytics' | 'default'

const ACOES_FGA: Record<ComponenteTipoFGA, { acao: string; label: string }[]> = {
  'assistente-ia': [
    { acao: 'can_use_assistant',             label: 'Usar o assistente' },
    { acao: 'can_share_conversation_results', label: 'Compartilhar resultados de conversas' },
    { acao: 'can_view_consulted_sources',    label: 'Visualizar fontes consultadas' },
    { acao: 'can_upload_rag_sources',        label: 'Upload de fontes RAG' },
    { acao: 'can_create_assistant',          label: 'Criar assistente' },
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
  'analytics': [
    { acao: 'can_view_dashboards',  label: 'Visualizar dashboards' },
    { acao: 'can_export_reports',   label: 'Exportar relatórios' },
    { acao: 'can_manage_analytics', label: 'Administrar analytics' },
  ],
  'default': [
    { acao: 'can_view',   label: 'Visualizar' },
    { acao: 'can_edit',   label: 'Editar' },
    { acao: 'can_manage', label: 'Administrar' },
  ],
}

// Ações padrão por papel (viewer → member → admin acumulam)
const DEFAULTS_POR_PAPEL: Record<string, Partial<Record<ComponenteTipoFGA, string[]>>> = {
  viewer: {
    'assistente-ia':    ['can_use_assistant'],
    'base-conhecimento':['pode_ler'],
    'analytics':        ['can_view_dashboards'],
    'default':          ['can_view'],
  },
  member: {
    'assistente-ia':    ['can_use_assistant', 'can_share_conversation_results', 'can_view_consulted_sources', 'can_upload_rag_sources'],
    'base-conhecimento':['pode_ler', 'pode_criar_documento', 'pode_editar', 'pode_enviar_para_aprovacao'],
    'analytics':        ['can_view_dashboards', 'can_export_reports'],
    'default':          ['can_view', 'can_edit'],
  },
  admin: {
    'assistente-ia':    ['can_use_assistant', 'can_share_conversation_results', 'can_view_consulted_sources', 'can_upload_rag_sources', 'can_create_assistant', 'can_configure_agents', 'can_manage_business_scenarios', 'can_manage_users'],
    'base-conhecimento':['pode_ler', 'pode_editar', 'pode_criar_documento', 'pode_enviar_para_aprovacao', 'pode_aprovar', 'pode_publicar', 'pode_excluir'],
    'analytics':        ['can_view_dashboards', 'can_export_reports', 'can_manage_analytics'],
    'default':          ['can_view', 'can_edit', 'can_manage'],
  },
}

function inferirTipoFGA(nome: string): ComponenteTipoFGA {
  const n = nome.toLowerCase()
  if (n.includes('assistente') || n.includes('pas core')) return 'assistente-ia'
  if (n.includes('base') || n.includes('knowledge') || n.includes('kb') || n.includes('jurídic')) return 'base-conhecimento'
  if (n.includes('analytics') || n.includes('analytic')) return 'analytics'
  return 'default'
}

// ── Tipos ─────────────────────────────────────────────────────

interface EfetivaFonte {
  atribuicaoId: string
  fonte: string
  entidadeId: string
}

type DocNixTab = 'diretas' | 'efetivo'

// ── FGA: descrições dos papéis ────────────────────────────────

const PAPEL_OPTIONS: { value: string; label: string; descricao: string }[] = [
  {
    value: 'viewer',
    label: 'Visualizador',
    descricao: 'Pode ver a instância, mas não pode interagir nem modificar dados.',
  },
  {
    value: 'member',
    label: 'Membro',
    descricao: 'Acesso padrão às funcionalidades da instância — leitura e uso.',
  },
  {
    value: 'admin',
    label: 'Administrador',
    descricao: 'Acesso completo: gerencia membros, atribuições e configurações.',
  },
]

// ── Badge de origem (aba Efetivo) ─────────────────────────────

function FonteBadge({ fonte, entidadeId }: { fonte: string; entidadeId: string }) {
  if (fonte === 'direto') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        Direto
      </span>
    )
  }
  if (fonte === 'grupo') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <Users className="w-3 h-3" />
        Via Grupo
        <span className="font-mono text-[10px] opacity-70">{entidadeId}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      {fonte}
    </span>
  )
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  instanciaId: string
  instanciaNome: string
  componenteId: string
  componenteNome?: string        // usado para inferir as ações FGA disponíveis
  componenteTipoModelo?: string
  membro: InstanciaMembro
  grupoNomes?: Record<string, string>
  onSaved?: () => void
}

// ── Componente principal ──────────────────────────────────────

export function PermissoesMembroSheet({
  open,
  onClose,
  instanciaId,
  instanciaNome,
  componenteId,
  componenteNome = '',
  componenteTipoModelo,
  membro,
  grupoNomes = {},
  onSaved,
}: Props) {
  const isDocNix = componenteTipoModelo === 'docnix'
  const isUser   = membro.entidadeTipo === 'user'
  const entityNome = membro.displayName ?? membro.entidadeId

  // Tipo de componente para ações FGA
  const tipoFGA = inferirTipoFGA(componenteNome)
  const acoesFGA = ACOES_FGA[tipoFGA]

  // ── Tab (DocNix) ───────────────────────────────────────────
  const [docNixTab, setDocNixTab] = useState<DocNixTab>('diretas')

  // ── FGA: papel + ações ────────────────────────────────────
  const [papel, setPapel]           = useState(membro.papel ?? 'member')
  const [fgaAcoes, setFgaAcoes]     = useState<string[]>([])   // ações salvas (original)
  const [fgaDraft, setFgaDraft]     = useState<string[]>([])   // draft editável
  const [loadingFga, setLoadingFga] = useState(false)
  const [savingPapel, setSavingPapel] = useState(false)
  const [papelError, setPapelError]   = useState<string | null>(null)

  // ── DocNix: atribuições diretas ───────────────────────────
  type GrupoHerdada = { atribuicaoId: string; grupoId: string }
  const [catalog, setCatalog]       = useState<Atribuicao[]>([])
  const [original, setOriginal]     = useState<string[]>([])
  const [draft, setDraft]           = useState<string[]>([])
  const [herdadas, setHerdadas]     = useState<GrupoHerdada[]>([])
  const [search, setSearch]         = useState('')
  const [loadingDir, setLoadingDir] = useState(false)
  const [savingDir, setSavingDir]   = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)

  // ── DocNix: permissões efetivas ───────────────────────────
  const [atribEfetivas, setAtribEfetivas]   = useState<string[]>([])
  const [fontesEfetivas, setFontesEfetivas] = useState<EfetivaFonte[]>([])
  const [atribuicoesMap, setAtribuicoesMap] = useState<Record<string, string>>({})
  const [loadingEfet, setLoadingEfet]       = useState(false)
  const [isUnrestricted, setIsUnrestricted] = useState(false)

  // ── Reset ao abrir ────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setDocNixTab('diretas')
    const papelAtual = membro.papel ?? 'member'
    setPapel(papelAtual)
    setPapelError(null)
    setSearch('')
    setSaveError(null)

    if (!isDocNix) {
      // FGA: carrega permissões granulares existentes na instância
      setLoadingFga(true)
      api.getPermissions({
        entidade_tipo: membro.entidadeTipo === 'user' ? 'user' : 'group',
        entidade_id:   membro.entidadeId,
        instancia_id:  instanciaId,
      })
        .then((perms: any[]) => {
          const existing = perms.map((p: any) => p.acao as string)
          if (existing.length > 0) {
            // Usa as permissões já salvas
            setFgaAcoes(existing)
            setFgaDraft(existing)
          } else {
            // Sem permissões salvas: pré-seleciona defaults do papel atual
            const defaults = DEFAULTS_POR_PAPEL[papelAtual]?.[tipoFGA] ?? []
            setFgaAcoes([])
            setFgaDraft(defaults)
          }
        })
        .catch(() => {
          // Fallback: pré-seleciona defaults do papel
          const defaults = DEFAULTS_POR_PAPEL[papelAtual]?.[tipoFGA] ?? []
          setFgaAcoes([])
          setFgaDraft(defaults)
        })
        .finally(() => setLoadingFga(false))
    }

    if (isDocNix) {
      // Carrega catálogo + atribuições diretas
      setLoadingDir(true)
      const efetivasFetch = isUser
        ? api.getPermissoesEfetivas(instanciaId, membro.entidadeId).catch(() => ({
            atribuicoes: [] as string[],
            fontes: [] as EfetivaFonte[],
          }))
        : Promise.resolve(null)

      Promise.all([
        api.getAtribuicoes(componenteId),
        api.getMembroAtribuicoes(instanciaId, membro.id),
        efetivasFetch,
      ])
        .then(([atribs, vinculos, efetivas]) => {
          const ativas = (atribs as Atribuicao[]).filter(a => a.status === 'Ativo')
          setCatalog(ativas)

          const map: Record<string, string> = {}
          ativas.forEach(a => { map[a.id] = a.nome })
          setAtribuicoesMap(map)

          const diretas = (vinculos as { atribuicaoId: string }[]).map(v => v.atribuicaoId)
          setOriginal(diretas)
          setDraft([...diretas])

          if (efetivas && isUser) {
            const fromGrupo = (efetivas as any).fontes
              .filter((f: EfetivaFonte) => f.fonte === 'grupo')
              .map((f: EfetivaFonte) => ({ atribuicaoId: f.atribuicaoId, grupoId: f.entidadeId }))
            setHerdadas(fromGrupo)

            if ((efetivas as any).atribuicoes.includes('*')) {
              setIsUnrestricted(true)
            } else {
              setAtribEfetivas((efetivas as any).atribuicoes)
              setFontesEfetivas((efetivas as any).fontes)
            }
          }
        })
        .finally(() => setLoadingDir(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, membro.id])

  // Carrega efetivas separadamente quando trocar para aba Efetivo
  useEffect(() => {
    if (!open || !isDocNix || !isUser || docNixTab !== 'efetivo' || atribEfetivas.length > 0 || isUnrestricted) return
    setLoadingEfet(true)
    Promise.all([
      api.getPermissoesEfetivas(instanciaId, membro.entidadeId),
      api.getAtribuicoes(componenteId),
    ])
      .then(([efetivas, atribs]) => {
        if (efetivas.atribuicoes.includes('*')) {
          setIsUnrestricted(true)
        } else {
          setAtribEfetivas(efetivas.atribuicoes)
          setFontesEfetivas(efetivas.fontes)
        }
        const map: Record<string, string> = {}
        ;(atribs as Atribuicao[]).forEach(a => { map[a.id] = a.nome })
        setAtribuicoesMap(prev => ({ ...prev, ...map }))
      })
      .finally(() => setLoadingEfet(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docNixTab, open])

  // ── Helpers ───────────────────────────────────────────────
  const herdadasSet = useMemo(
    () => new Set(herdadas.map(h => h.atribuicaoId)),
    [herdadas],
  )
  const herdadaPorAtrib = useMemo(() => {
    const map: Record<string, GrupoHerdada[]> = {}
    for (const h of herdadas) {
      if (!map[h.atribuicaoId]) map[h.atribuicaoId] = []
      map[h.atribuicaoId].push(h)
    }
    return map
  }, [herdadas])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      a => a.nome.toLowerCase().includes(q) || (a.modulo ?? '').toLowerCase().includes(q),
    )
  }, [catalog, search])

  const hasChanges = useMemo(() => {
    if (!isDocNix) return papel !== (membro.papel ?? 'member')
    const o = new Set(original)
    if (draft.length !== original.length) return true
    return draft.some(id => !o.has(id))
  }, [isDocNix, papel, membro.papel, original, draft])

  function toggleAtrib(atribuicaoId: string) {
    const soHerdada = herdadasSet.has(atribuicaoId) && !draft.includes(atribuicaoId)
    if (soHerdada) return
    setDraft(prev =>
      prev.includes(atribuicaoId)
        ? prev.filter(id => id !== atribuicaoId)
        : [...prev, atribuicaoId],
    )
  }

  function handleClose() {
    setSearch('')
    setSaveError(null)
    setPapelError(null)
    onClose()
  }

  async function handleSalvar() {
    if (isDocNix) {
      // Salva atribuições
      setSavingDir(true)
      setSaveError(null)
      const origSet  = new Set(original)
      const draftSet = new Set(draft)
      try {
        const toAdd    = draft.filter(id => !origSet.has(id))
        const toRemove = original.filter(id => !draftSet.has(id))
        await Promise.all([
          ...toAdd.map(id => api.addMembroAtribuicao(instanciaId, membro.id, id)),
          ...toRemove.map(id => api.removeMembroAtribuicao(instanciaId, membro.id, id)),
        ])
        setOriginal([...draft])
        onSaved?.()
        handleClose()
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Erro ao salvar atribuições.')
      } finally {
        setSavingDir(false)
      }
    } else {
      // Salva papel FGA
      setSavingPapel(true)
      setPapelError(null)
      try {
        await api.addInstanciaMembro(instanciaId, {
          entidadeTipo: membro.entidadeTipo,
          entidadeId:   membro.entidadeId,
          papel,
        })
        onSaved?.()
        handleClose()
      } catch {
        setPapelError('Erro ao salvar. Tente novamente.')
      } finally {
        setSavingPapel(false)
      }
    }
  }

  const saving = savingDir || savingPapel

  const diretasCount  = draft.length
  const herdadasCount = [...herdadasSet].filter(id => !draft.includes(id)).length

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[520px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Permissões — {entityNome}</NestedSheetTitle>
        <NestedSheetDescription>
          {membro.entidadeTipo === 'group'
            ? `Grupo · ${instanciaNome}`
            : instanciaNome}
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody noPadding>

        {/* ── FGA: seletor de papel ──────────────────────────── */}
        {!isDocNix && (
          <div className="px-6 py-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nível de acesso</p>
            {PAPEL_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors',
                  papel === opt.value
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <input
                  type="radio"
                  name="papel"
                  value={opt.value}
                  checked={papel === opt.value}
                  onChange={() => setPapel(opt.value)}
                  className="mt-0.5 accent-blue-600 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.descricao}</p>
                </div>
              </label>
            ))}
            {papelError && (
              <p className="text-xs text-red-600">{papelError}</p>
            )}
          </div>
        )}

        {/* ── DocNix: tabs Diretas | Efetivo ────────────────── */}
        {isDocNix && (
          <>
            {/* Tab bar — só mostra "Efetivo" para usuários */}
            <div className="flex border-b border-gray-200 px-6">
              {(['diretas', ...(isUser ? ['efetivo'] : [])] as DocNixTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setDocNixTab(t)}
                  className={cn(
                    'px-1 py-3 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors',
                    docNixTab === t
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  )}
                >
                  {t === 'diretas' ? (
                    <>
                      Diretas
                      {!loadingDir && (
                        <span className="ml-1 text-xs font-normal text-gray-400">
                          ({diretasCount + herdadasCount})
                        </span>
                      )}
                    </>
                  ) : 'Efetivo'}
                </button>
              ))}
            </div>

            {/* ── Aba: Diretas ──────────────────────────────── */}
            {docNixTab === 'diretas' && (
              <>
                {isUser && herdadas.length > 0 && (
                  <div className="flex items-start gap-3 mx-6 mt-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-800">
                      Itens marcados com <strong>Via Grupo</strong> vêm de grupos do usuário.
                      Para alterá-los, edite as atribuições do grupo correspondente.
                    </p>
                  </div>
                )}

                <div className="px-6 py-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-sm">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar atribuição..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">×</button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border-t border-gray-100 max-h-[min(55vh,440px)]">
                  {loadingDir ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-10">
                      {search ? 'Nenhuma atribuição encontrada.' : 'Nenhuma atribuição cadastrada para este componente.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {filtered.map(a => {
                        const herdadasDesteAtrib = herdadaPorAtrib[a.id] ?? []
                        const soHerdada = herdadasDesteAtrib.length > 0 && !draft.includes(a.id)
                        const checked   = draft.includes(a.id) || soHerdada

                        return (
                          <div
                            key={a.id}
                            className={cn('px-6 py-2.5', soHerdada && 'bg-emerald-50/40')}
                          >
                            <label className={cn(
                              'flex items-start gap-2.5',
                              soHerdada ? 'cursor-default' : 'cursor-pointer',
                              saving && 'opacity-60 pointer-events-none',
                            )}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={soHerdada || saving}
                                onChange={() => !soHerdada && toggleAtrib(a.id)}
                                className={cn(
                                  'mt-0.5 w-4 h-4 rounded border-gray-300 shrink-0',
                                  soHerdada ? 'accent-emerald-600 cursor-default' : 'accent-blue-600',
                                )}
                              />
                              <span className="flex-1 min-w-0">
                                <span className={cn('text-sm', checked ? 'font-medium text-gray-900' : 'text-gray-700')}>
                                  {a.nome}
                                </span>
                                {a.modulo && (
                                  <span className="ml-1.5 text-xs text-gray-400">({a.modulo})</span>
                                )}
                                {soHerdada && (
                                  <span className="mt-1 flex flex-wrap gap-1">
                                    {herdadasDesteAtrib.map((h, i) => (
                                      <span
                                        key={`${h.grupoId}-${i}`}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200"
                                      >
                                        <Lock className="w-2.5 h-2.5" />
                                        Via {grupoNomes[h.grupoId] ?? h.grupoId}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </span>
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Footer info */}
                {!loadingDir && catalog.length > 0 && (
                  <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <strong className="text-gray-700">{diretasCount}</strong> direta{diretasCount !== 1 ? 's' : ''}
                    {isUser && herdadasCount > 0 && (
                      <> · <strong className="text-gray-700">{herdadasCount}</strong> só via grupo</>
                    )}
                    {!isUser && (
                      <span className="ml-2 text-gray-400">
                        — membros do grupo herdam estas atribuições
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Aba: Efetivo (apenas usuários) ────────────── */}
            {docNixTab === 'efetivo' && isUser && (
              <div className="px-6 py-5">
                {loadingEfet ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                  </div>
                ) : isUnrestricted ? (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
                    Acesso irrestrito — administrador com todas as permissões nesta instância.
                  </div>
                ) : atribEfetivas.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium text-gray-800">Nenhuma atribuição efetiva</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Este usuário não possui atribuições ativas nesta instância.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Atribuição</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Origem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atribEfetivas.map(atribId => {
                          const nome          = atribuicoesMap[atribId] ?? atribId
                          const fontesDoAtrib = fontesEfetivas.filter(f => f.atribuicaoId === atribId)

                          if (fontesDoAtrib.length === 0) {
                            return (
                              <tr key={atribId} className="border-b border-gray-100 last:border-0">
                                <td className="px-4 py-2.5 font-medium text-gray-900">{nome}</td>
                                <td className="px-4 py-2.5 text-xs text-gray-400">—</td>
                              </tr>
                            )
                          }
                          return fontesDoAtrib.map((f, idx) => (
                            <tr key={`${atribId}-${idx}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-900">
                                {idx === 0 ? nome : ''}
                              </td>
                              <td className="px-4 py-2.5">
                                <FonteBadge fonte={f.fonte} entidadeId={f.entidadeId} />
                              </td>
                            </tr>
                          ))
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </NestedSheetBody>

      <NestedSheetFooter>
        {(saveError || papelError) && (
          <p className="text-xs text-red-600 flex-1 mr-2">{saveError ?? papelError}</p>
        )}
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        {/* Aba Efetivo é read-only — não mostra Salvar */}
        {(!isDocNix || docNixTab === 'diretas') && (
          <Button onClick={handleSalvar} disabled={!hasChanges || saving || loadingDir}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        )}
      </NestedSheetFooter>
    </NestedSheet>
  )
}
