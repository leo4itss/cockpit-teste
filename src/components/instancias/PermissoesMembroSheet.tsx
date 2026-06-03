/**
 * PermissoesMembroSheet — painel unificado de permissões por membro.
 *
 * FGA:    radio Visualizador / Membro / Administrador + checkboxes de ações (pré-selecionadas por papel).
 *         Quando o papel muda, as ações são atualizadas com os defaults do novo papel.
 * DocNix: cards de papel (mockDocNixPapeis) + título + checkboxes de atribuições (sem busca).
 *         Quando um card é selecionado, as atribuições são pré-selecionadas automaticamente.
 */

import { useState, useEffect, useMemo } from 'react'
import { Users, Lock, Loader2 } from 'lucide-react'
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
import { mockDocNixPapeis } from '@/authz/mock'

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

  // ── FGA: papel + ações ────────────────────────────────────
  const [papel, setPapel]           = useState(membro.papel ?? 'member')
  const [fgaAcoes, setFgaAcoes]     = useState<string[]>([])
  const [fgaDraft, setFgaDraft]     = useState<string[]>([])
  const [loadingFga, setLoadingFga] = useState(false)
  const [savingPapel, setSavingPapel] = useState(false)
  const [papelError, setPapelError]   = useState<string | null>(null)

  // ── DocNix: papel selecionado ─────────────────────────────
  const [papelDocNix, setPapelDocNix] = useState<string>('personalizado')

  // ── DocNix: atribuições diretas ───────────────────────────
  type GrupoHerdada = { atribuicaoId: string; grupoId: string }
  const [catalog, setCatalog]       = useState<Atribuicao[]>([])
  const [original, setOriginal]     = useState<string[]>([])
  const [draft, setDraft]           = useState<string[]>([])
  const [herdadas, setHerdadas]     = useState<GrupoHerdada[]>([])
  const [loadingDir, setLoadingDir] = useState(false)
  const [savingDir, setSavingDir]   = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)

  // ── Módulo DocNix detectado pelo catálogo ─────────────────
  const moduloDetectado = useMemo(
    () => catalog.find(a => a.modulo)?.modulo ?? null,
    [catalog],
  )
  const papeisDocNix = useMemo(
    () => moduloDetectado
      ? mockDocNixPapeis.filter(p => p.modulo === moduloDetectado)
      : mockDocNixPapeis,
    [moduloDetectado],
  )

  // ── Reset ao abrir ────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const papelAtual = membro.papel ?? 'member'
    setPapel(papelAtual)
    setPapelError(null)
    setSaveError(null)

    if (!isDocNix) {
      setLoadingFga(true)
      api.getPermissions({
        entidade_tipo: membro.entidadeTipo === 'user' ? 'user' : 'group',
        entidade_id:   membro.entidadeId,
        instancia_id:  instanciaId,
      })
        .then((perms: any[]) => {
          const existing = perms.map((p: any) => p.acao as string)
          if (existing.length > 0) {
            setFgaAcoes(existing)
            setFgaDraft(existing)
          } else {
            const defaults = DEFAULTS_POR_PAPEL[papelAtual]?.[tipoFGA] ?? []
            setFgaAcoes([])
            setFgaDraft(defaults)
          }
        })
        .catch(() => {
          const defaults = DEFAULTS_POR_PAPEL[papelAtual]?.[tipoFGA] ?? []
          setFgaAcoes([])
          setFgaDraft(defaults)
        })
        .finally(() => setLoadingFga(false))
    }

    if (isDocNix) {
      setLoadingDir(true)
      Promise.all([
        api.getAtribuicoes(componenteId),
        api.getMembroAtribuicoes(instanciaId, membro.id),
        isUser
          ? api.getPermissoesEfetivas(instanciaId, membro.entidadeId).catch(() => null)
          : Promise.resolve(null),
      ])
        .then(([atribs, vinculos, efetivas]) => {
          const ativas = (atribs as Atribuicao[]).filter(a => a.status === 'Ativo')
          setCatalog(ativas)

          const diretas = (vinculos as { atribuicaoId: string }[]).map(v => v.atribuicaoId)
          setOriginal(diretas)
          setDraft([...diretas])

          // Tenta detectar qual papel corresponde às atribuições atuais
          const papelCurrent = membro.papel ?? ''
          const papelMatch = mockDocNixPapeis.find(p => p.value === papelCurrent)
          setPapelDocNix(papelMatch ? papelMatch.value : 'personalizado')

          if (efetivas && isUser) {
            const fromGrupo = (efetivas as any).fontes
              .filter((f: { fonte: string; atribuicaoId: string; entidadeId: string }) => f.fonte === 'grupo')
              .map((f: { fonte: string; atribuicaoId: string; entidadeId: string }) => ({ atribuicaoId: f.atribuicaoId, grupoId: f.entidadeId }))
            setHerdadas(fromGrupo)
          }
        })
        .finally(() => setLoadingDir(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, membro.id])

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

  // Quando o papel muda (FGA), aplica os defaults do novo papel como ponto de partida
  function handlePapelChange(novoPapel: string) {
    setPapel(novoPapel as 'viewer' | 'member' | 'admin')
    const defaults = DEFAULTS_POR_PAPEL[novoPapel]?.[tipoFGA] ?? []
    setFgaDraft(defaults)
  }

  // Quando um card DocNix é selecionado, pré-seleciona atribuições correspondentes
  function handlePapelDocNix(valor: string) {
    setPapelDocNix(valor)
    const papelInfo = mockDocNixPapeis.find(p => p.value === valor)
    if (!papelInfo) { setDraft([]); return }
    const ativas = catalog.filter(a => a.status === 'Ativo')
    const novasIds = papelInfo.atribuicaoNomes.length === 0
      ? ativas.map(a => a.id)
      : ativas.filter(a => papelInfo.atribuicaoNomes.includes(a.nome)).map(a => a.id)
    setDraft(novasIds)
  }

  function toggleFgaAcao(acao: string) {
    setFgaDraft(prev =>
      prev.includes(acao) ? prev.filter(a => a !== acao) : [...prev, acao]
    )
  }

  const hasChanges = useMemo(() => {
    if (!isDocNix) {
      const papelChanged = papel !== (membro.papel ?? 'member')
      const acoesChanged = (() => {
        const o = new Set(fgaAcoes)
        if (fgaDraft.length !== o.size) return true
        return fgaDraft.some(a => !o.has(a))
      })()
      return papelChanged || acoesChanged
    }
    const o = new Set(original)
    if (draft.length !== original.length) return true
    return draft.some(id => !o.has(id))
  }, [isDocNix, papel, membro.papel, fgaAcoes, fgaDraft, original, draft])

  function toggleAtrib(atribuicaoId: string) {
    const soHerdada = herdadasSet.has(atribuicaoId) && !draft.includes(atribuicaoId)
    if (soHerdada) return
    // Ao alterar manualmente, volta para "Personalizado"
    setPapelDocNix('personalizado')
    setDraft(prev =>
      prev.includes(atribuicaoId)
        ? prev.filter(id => id !== atribuicaoId)
        : [...prev, atribuicaoId],
    )
  }

  function handleClose() {
    setSaveError(null)
    setPapelError(null)
    onClose()
  }

  async function handleSalvar() {
    if (isDocNix) {
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
      setSavingPapel(true)
      setPapelError(null)
      try {
        await api.addInstanciaMembro(instanciaId, {
          entidadeTipo: membro.entidadeTipo,
          entidadeId:   membro.entidadeId,
          papel,
        })
        const entidadeTipo = membro.entidadeTipo === 'user' ? 'user' : 'group'
        const origSet  = new Set(fgaAcoes)
        const draftSet = new Set(fgaDraft)
        const toAdd    = fgaDraft.filter(a => !origSet.has(a))
        const toRemove = fgaAcoes.filter(a => !draftSet.has(a))
        await Promise.all([
          ...toAdd.map(acao => api.addPermission({
            entidade_tipo: entidadeTipo,
            entidade_id:   membro.entidadeId,
            componente_id: componenteId,
            acao,
            instancia_id:  instanciaId,
          }).catch(() => null)),
          ...toRemove.map(acao => api.removePermission({
            entidade_tipo: entidadeTipo,
            entidade_id:   membro.entidadeId,
            componente_id: componenteId,
            acao,
            instancia_id:  instanciaId,
          }).catch(() => null)),
        ])
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

        {/* ── FGA: seletor de papel + ações ─────────────────── */}
        {!isDocNix && (
          <div className="px-6 py-5 space-y-4">
            {/* Seletor de papel */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Papel</p>
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
                    onChange={() => handlePapelChange(opt.value)}
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

            {/* Ações incluídas neste papel */}
            {acoesFGA.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Ações da instância
                </p>
                {loadingFga ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {acoesFGA.map(({ acao, label }) => (
                      <label
                        key={acao}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={fgaDraft.includes(acao)}
                          onChange={() => toggleFgaAcao(acao)}
                          className="w-4 h-4 rounded border-gray-300 accent-blue-600 shrink-0"
                        />
                        <span className={cn(
                          'text-sm flex-1',
                          fgaDraft.includes(acao) ? 'font-medium text-gray-900' : 'text-gray-500',
                        )}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Ao alterar o papel, as ações são atualizadas com os valores padrão — ajuste conforme necessário.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── DocNix: cards de papel + ações ────────────────── */}
        {isDocNix && (
          <div className="px-6 py-5 space-y-5">

            {/* Cards de papel */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Papel</p>
              <div className="grid grid-cols-3 gap-1.5">
                {papeisDocNix.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePapelDocNix(p.value)}
                    className={cn(
                      'flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors',
                      papelDocNix === p.value
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50',
                    )}
                  >
                    <span className="text-xs font-medium text-gray-900">{p.label}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">{p.desc}</span>
                  </button>
                ))}
                {/* Card Personalizado */}
                <button
                  type="button"
                  onClick={() => { setPapelDocNix('personalizado'); setDraft([]) }}
                  className={cn(
                    'flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors',
                    papelDocNix === 'personalizado'
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50',
                  )}
                >
                  <span className="text-xs font-medium text-gray-900">Personalizado</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">Selecionar manualmente</span>
                </button>
              </div>
            </div>

            {/* Aviso de herança via grupo */}
            {isUser && herdadas.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">
                  Itens marcados com <strong>Via Grupo</strong> vêm de grupos do usuário.
                  Para alterá-los, edite as ações do grupo correspondente.
                </p>
              </div>
            )}

            {/* Ações da instância */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Ações da instância
              </p>
              {loadingDir ? (
                <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Carregando...
                </div>
              ) : catalog.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Nenhuma ação cadastrada para este componente.
                </p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[min(50vh,380px)] overflow-y-auto">
                  {catalog.map(a => {
                    const herdadasDesteAtrib = herdadaPorAtrib[a.id] ?? []
                    const soHerdada = herdadasDesteAtrib.length > 0 && !draft.includes(a.id)
                    const checked   = draft.includes(a.id) || soHerdada

                    return (
                      <div
                        key={a.id}
                        className={cn('px-4', soHerdada && 'bg-emerald-50/40')}
                      >
                        <label className={cn(
                          'flex items-start gap-3 py-2.5',
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

              {/* Info rodapé */}
              {!loadingDir && catalog.length > 0 && (
                <p className="text-xs text-gray-400">
                  <strong className="text-gray-600">{diretasCount}</strong> ação{diretasCount !== 1 ? 'ões' : ''} selecionada{diretasCount !== 1 ? 's' : ''}
                  {isUser && herdadasCount > 0 && (
                    <> · <strong className="text-gray-600">{herdadasCount}</strong> só via grupo</>
                  )}
                </p>
              )}
            </div>

          </div>
        )}

      </NestedSheetBody>

      <NestedSheetFooter>
        {(saveError || papelError) && (
          <p className="text-xs text-red-600 flex-1 mr-2">{saveError ?? papelError}</p>
        )}
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSalvar} disabled={!hasChanges || saving || loadingDir}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
