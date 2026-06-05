import { useState, useEffect, useMemo } from 'react'
import { Search, Bot, Database, Layers, Users, Lock } from 'lucide-react'
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
import { accountEntitlements as mockEntitlements } from '@/data/mock'
import { getComponenteConfig } from '@/authz/mock'
import type { Componente } from '@/types'

// ── Tipos ──────────────────────────────────────────────────────

type ComponenteTipo = 'assistente-ia' | 'base-conhecimento' | 'analytics' | 'default'

interface AcaoItem { acao: string; label: string }

const ACOES: Record<ComponenteTipo, AcaoItem[]> = {
  // Ordem: do mais básico (uso) ao mais privilegiado (administração)
  // Alinhado com o modelo FGA oficial: openfga/authorization-model.fga
  'assistente-ia': [
    { acao: 'can_use_assistant',             label: 'Usar o assistente' },
    { acao: 'can_share_conversation_results',label: 'Compartilhar resultados de conversas' },
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
    { acao: 'can_view_dashboards',   label: 'Visualizar dashboards' },
    { acao: 'can_export_reports',    label: 'Exportar relatórios' },
    { acao: 'can_manage_analytics',  label: 'Administrar analytics' },
  ],
  'default': [
    { acao: 'can_view',   label: 'Visualizar' },
    { acao: 'can_edit',   label: 'Editar' },
    { acao: 'can_manage', label: 'Administrar' },
  ],
}

// ── Mapeamento tipo → capability id ───────────────────────────
// Alinhado com account_entitlements: capability = 'assistant.use' | 'knowledge.use' | 'analytics.use'
// Componentes do tipo 'default' não têm capability associada (sempre disponíveis).
const CAPABILITY_MAP: Partial<Record<ComponenteTipo, string>> = {
  'assistente-ia':    'assistant.use',
  'base-conhecimento':'knowledge.use',
  'analytics':        'analytics.use',
}

// ── Permissões padrão por papel ────────────────────────────────
// Quando o grupo tem um papel definido e não tem permissões ainda,
// essas ações são pré-selecionadas automaticamente.
const DEFAULTS_BY_PAPEL: Record<string, Partial<Record<ComponenteTipo, string[]>>> = {
  'Viewer': {
    'assistente-ia':    ['can_use_assistant'],
    'base-conhecimento':['pode_ler'],
    'analytics':        ['can_view_dashboards'],
    'default':          ['can_view'],
  },
  'User': {
    'assistente-ia':    ['can_use_assistant', 'can_share_conversation_results', 'can_view_consulted_sources', 'can_upload_rag_sources'],
    'base-conhecimento':['pode_ler', 'pode_criar_documento', 'pode_editar', 'pode_enviar_para_aprovacao'],
    'analytics':        ['can_view_dashboards', 'can_export_reports'],
    'default':          ['can_view', 'can_edit'],
  },
  'Admin': {
    'assistente-ia':    ['can_use_assistant', 'can_share_conversation_results', 'can_view_consulted_sources', 'can_upload_rag_sources', 'can_create_assistant', 'can_configure_agents', 'can_manage_business_scenarios', 'can_manage_users'],
    'base-conhecimento':['pode_ler', 'pode_editar', 'pode_criar_documento', 'pode_enviar_para_aprovacao', 'pode_aprovar', 'pode_publicar', 'pode_excluir'],
    'analytics':        ['can_view_dashboards', 'can_export_reports', 'can_manage_analytics'],
    'default':          ['can_view', 'can_edit', 'can_manage'],
  },
}

interface Props {
  open:        boolean
  onClose:     () => void
  entityType:  'usuario' | 'grupo'
  entityId:    string
  entityNome:  string
  accountId:   string
  accountNome?: string
  papel?:      string   // papel do grupo — usado para pré-selecionar defaults
  onSuccess?:  () => void
  // Modo instância: restringe à instância e ao componente específico
  instanciaId?:         string
  instanciaComponenteId?: string
  instanciaNome?:       string
}

// ── Helpers ────────────────────────────────────────────────────

function inferirTipo(nome: string): ComponenteTipo {
  const n = nome.toLowerCase()
  if (n.includes('assistente') || n.includes('pas core')) return 'assistente-ia'
  if (n.includes('base') || n.includes('knowledge') || n.includes('kb') || n.includes('jurídic')) return 'base-conhecimento'
  if (n.includes('analytics') || n.includes('analytic')) return 'analytics'
  return 'default'
}

function ComponenteIcon({ tipo, locked }: { tipo: ComponenteTipo; locked?: boolean }) {
  const cls = locked ? 'opacity-40' : ''
  if (tipo === 'assistente-ia')     return <Bot      className={cn('w-5 h-5 text-violet-500 shrink-0', cls)} />
  if (tipo === 'base-conhecimento') return <Database className={cn('w-5 h-5 text-blue-500 shrink-0', cls)} />
  if (tipo === 'analytics')         return <Layers   className={cn('w-5 h-5 text-emerald-500 shrink-0', cls)} />
  return                                   <Layers   className={cn('w-5 h-5 text-gray-400 shrink-0', cls)} />
}

// ── Componente principal ───────────────────────────────────────

export function AtribuirPermissoesSheet({
  open, onClose, entityType, entityId, entityNome, accountId, accountNome, papel, onSuccess,
  instanciaId, instanciaComponenteId, instanciaNome,
}: Props) {
  const [componentes, setComponentes]       = useState<Componente[]>([])
  const [activeCapabilities, setActiveCapabilities] = useState<Set<string>>(new Set())
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [saving, setSaving]                 = useState(false)
  const [saveError, setSaveError]           = useState<string | null>(null)
  const [defaultsAplicados, setDefaultsAplicados] = useState(false)

  // componenteId → string[] de ações ativas (diretas)
  const [original, setOriginal] = useState<Record<string, string[]>>({})
  const [draft, setDraft]       = useState<Record<string, string[]>>({})
  // componenteId → papel selecionado ('personalizado' se editado manualmente)
  const [papelSelecionado, setPapelSelecionado] = useState<Record<string, string>>({})
  // componenteId → { acao → nome do grupo que concede } (permissões herdadas via grupo)
  const [inherited, setInherited] = useState<Record<string, Record<string, string>>>({})
  // componenteId → AcaoItem[] vindas do catálogo DocNix (substitui ACOES['default'] quando presente)
  const [atribuicoesMap, setAtribuicoesMap] = useState<Record<string, AcaoItem[]>>({})


  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setSearch('')
    setDefaultsAplicados(false)

    const entidadeTipo = entityType === 'usuario' ? 'user' : 'group'
    const modoInstancia = !!instanciaId

    const entitlementsFetch: Promise<any[]> = accountId
      ? api.getEntitlements(accountId).catch(() =>
          (mockEntitlements[accountId] ?? []).map(cap => ({ capability: cap }))
        )
      : Promise.resolve([])

    Promise.all([
      api.getComponentes(),
      api.getPermissions({
        entidade_tipo: entidadeTipo,
        entidade_id:   entityId,
        ...(modoInstancia
          ? { instancia_id: instanciaId }          // modo instância: só perms desta instância
          : { instancia_id: null }),                // modo componente: só perms sem instância
      }).catch(() => []),
      entitlementsFetch,
    ])
      .then(async ([comps, perms, entitlements]) => {
        if (cancelled) return

        let ativos = (comps as Componente[]).filter(c => c.status !== 'Inativo')
        // Modo instância: exibe apenas o componente da instância
        if (modoInstancia && instanciaComponenteId) {
          ativos = ativos.filter(c => c.id === instanciaComponenteId)
        }
        setComponentes(ativos)

        // Busca atribuições DocNix de cada componente (paralelo, silencia falhas)
        const atribResults = await Promise.all(
          ativos.map(c =>
            api.getAtribuicoes(c.id)
              .then((atribs: any[]) => ({ id: c.id, atribs: atribs.filter((a: any) => a.status !== 'Inativo') }))
              .catch(() => ({ id: c.id, atribs: [] }))
          )
        )
        if (!cancelled) {
          const newAtribMap: Record<string, AcaoItem[]> = {}
          atribResults.forEach(({ id, atribs }) => {
            if (atribs.length > 0) {
              newAtribMap[id] = atribs.map((a: any) => ({ acao: a.id, label: a.nome }))
            }
          })
          setAtribuicoesMap(newAtribMap)
        }

        // Constrói o Set de capabilities ativas.
        // Se accountId vazio (grupo org) ou entitlements vazio → Set vazio → nenhum lock.
        const caps = new Set<string>(
          (entitlements as any[]).map((e: any) => e.capability as string)
        )
        // Grupos org-scoped não têm conta → sem entitlement check → tudo desbloqueado
        setActiveCapabilities(accountId ? caps : new Set<string>(['assistant.use', 'knowledge.use', 'analytics.use']))

        // Monta mapa de permissões existentes
        const emptyMap: Record<string, string[]> = {}
        ativos.forEach(c => { emptyMap[c.id] = [] })

        const permMap: Record<string, string[]> = { ...emptyMap }
        ;(perms as any[]).forEach((p: any) => {
          const cid = p.componenteId ?? p.componente_id
          if (cid !== undefined && permMap[cid] !== undefined) {
            permMap[cid] = [...permMap[cid], p.acao]
          }
        })

        // Pré-seleção por papel: aplica defaults quando não há permissões salvas
        const hasExistingPerms = (perms as any[]).length > 0
        const defaults = papel ? DEFAULTS_BY_PAPEL[papel] : null
        const draftMap = JSON.parse(JSON.stringify(permMap)) as Record<string, string[]>

        if (!hasExistingPerms && defaults) {
          let anyDefaultApplied = false
          ativos.forEach(c => {
            // Só pula componentes DocNix — esses têm catálogo próprio de atribuições
            // Componentes FGA podem ter atribuições extras no banco, mas ainda usam os defaults por papel
            if (c.tipoModelo === 'docnix') return
            const tipo = inferirTipo(c.nome)
            const acoesDefault = defaults[tipo] ?? []
            // Só pré-seleciona ações que existem no catálogo daquele tipo
            const acoesValidas = ACOES[tipo].map(a => a.acao)
            const aplicadas = acoesDefault.filter(a => acoesValidas.includes(a))
            if (aplicadas.length > 0) {
              draftMap[c.id] = aplicadas
              anyDefaultApplied = true
            }
          })
          // Só exibe o banner se defaults foram realmente aplicados
          if (!cancelled && anyDefaultApplied) setDefaultsAplicados(true)
        }

        setOriginal(permMap)
        setDraft(draftMap)

        // ── Permissões herdadas via grupos (só para usuários, fora do modo instância) ──
        if (entityType === 'usuario' && accountId && !modoInstancia) {
          api.getUserGrupos(entityId, accountId)
            .then(async (userGrupos: any[]) => {
              if (cancelled || userGrupos.length === 0) return
              const grupoPerms = await Promise.all(
                userGrupos.map((g: any) =>
                  api.getPermissions({ entidade_tipo: 'group', entidade_id: g.id, instancia_id: null })
                    .then((perms: any[]) => ({ grupo: g, perms }))
                    .catch(() => ({ grupo: g, perms: [] }))
                )
              )
              // Monta mapa: componenteId → { acao → grupoNome }
              const inheritedMap: Record<string, Record<string, string>> = {}
              for (const { grupo, perms } of grupoPerms) {
                for (const p of perms) {
                  const cid = p.componenteId ?? p.componente_id
                  if (!cid) continue
                  if (!inheritedMap[cid]) inheritedMap[cid] = {}
                  // Só registra se ainda não tiver (primeiro grupo vence no label)
                  if (!inheritedMap[cid][p.acao]) inheritedMap[cid][p.acao] = grupo.nome
                }
              }
              if (!cancelled) setInherited(inheritedMap)
            })
            .catch(() => {/* silencia — herdadas são informativas */})
        } else {
          setInherited({})
        }
      })
      .catch(() => {
        // Só cai aqui se getComponentes() falhar — o resto já tem .catch() individual
        if (cancelled) return
        setOriginal({}); setDraft({})
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entityId, entityType, accountId, instanciaId, instanciaComponenteId, papel])

  const filtered = useMemo(() => {
    if (!search.trim()) return componentes
    const q = search.toLowerCase()
    return componentes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.descricao ?? '').toLowerCase().includes(q)
    )
  }, [componentes, search])

  // Retorna as ações do componente: catálogo DocNix se disponível, senão fallback hardcoded
  function getAcoes(comp: Componente): AcaoItem[] {
    const docnix = atribuicoesMap[comp.id]
    if (docnix && docnix.length > 0) return docnix
    return ACOES[inferirTipo(comp.nome)]
  }

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

  // Total visível = diretas + herdadas (sem duplicar)
  const totalAcoes = useMemo(() => {
    const allIds = new Set<string>()
    for (const [cid, acoes] of Object.entries(draft)) {
      acoes.forEach(a => allIds.add(`${cid}:${a}`))
    }
    for (const [cid, acaoMap] of Object.entries(inherited)) {
      Object.keys(acaoMap).forEach(a => allIds.add(`${cid}:${a}`))
    }
    return allIds.size
  }, [draft, inherited])

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
              ...(instanciaId ? { instancia_id: instanciaId } : {}),
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
              ...(instanciaId ? { instancia_id: instanciaId } : {}),
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
    setSearch(''); setOriginal({}); setDraft({}); setComponentes([])
    setActiveCapabilities(new Set()); setSaveError(null); setInherited({})
    setPapelSelecionado({})
    onClose()
  }

  const contaNome = accountNome ?? accountId
  const isGrupo   = entityType === 'grupo'

  // Conta quantos componentes estão bloqueados por falta de entitlement
  const bloqueadosCount = filtered.filter(c => {
    const tipo = inferirTipo(c.nome)
    const cap  = CAPABILITY_MAP[tipo]
    return cap !== undefined && !activeCapabilities.has(cap)
  }).length

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[560px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Permissões — {entityNome}</NestedSheetTitle>
        <NestedSheetDescription>
          {instanciaId
            ? <>Ações permitidas para <strong>{entityNome}</strong> na instância <strong>{instanciaNome}</strong>.</>
            : <>Selecione as ações permitidas em cada componente disponível na conta <strong>{contaNome}</strong>.</>
          }
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

          {/* Banner de defaults aplicados por papel */}
          {defaultsAplicados && papel && (
            <div className="flex items-start gap-3 mx-6 mt-3 p-3.5 rounded-xl border border-blue-200 bg-blue-50">
              <span className="text-base shrink-0 mt-0.5">✦</span>
              <p className="text-sm text-blue-800">
                Pré-selecionamos as permissões padrão para o papel{' '}
                <strong>{papel}</strong>. Ajuste conforme necessário antes de salvar.
              </p>
            </div>
          )}

          {/* Banner de permissões herdadas via grupos */}
          {!loading && entityType === 'usuario' && Object.keys(inherited).length > 0 && (
            <div className="flex items-start gap-3 mx-6 mt-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50">
              <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">
                Algumas ações estão marcadas via <strong>grupo</strong> — são somente leitura.
                Você pode adicionar permissões diretas adicionais ao usuário.
              </p>
            </div>
          )}

          {/* Banner de entitlements bloqueados */}
          {!loading && bloqueadosCount > 0 && (
            <div className="flex items-start gap-3 mx-6 mt-5 p-3.5 rounded-xl border border-amber-200 bg-amber-50">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>{bloqueadosCount} {bloqueadosCount === 1 ? 'componente' : 'componentes'}</strong>{' '}
                {bloqueadosCount === 1 ? 'está bloqueado' : 'estão bloqueados'} porque a capability correspondente
                não está ativa para esta conta. Ative-a em{' '}
                <strong>Contas → Licenças Ativas</strong> antes de atribuir permissões.
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
                  const tipo          = inferirTipo(comp.nome)
                  const acoes         = getAcoes(comp)
                  const ativas        = draft[comp.id] ?? []
                  const inheritedComp = inherited[comp.id] ?? {}
                  // Total visível = diretas + herdadas (sem duplicar)
                  const ativasVisiveis = new Set([...ativas, ...Object.keys(inheritedComp)])

                  // Verifica se a capability deste componente está ativa na conta
                  const capRequired = CAPABILITY_MAP[tipo]
                  const locked      = capRequired !== undefined && !activeCapabilities.has(capRequired)

                  return (
                    <div
                      key={comp.id}
                      className={cn(
                        'px-6 py-4 transition-colors',
                        locked && 'bg-gray-50/80',
                      )}
                    >
                      {/* Header do componente */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="mt-0.5">
                          <ComponenteIcon tipo={tipo} locked={locked} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn(
                              'text-sm font-medium leading-5',
                              locked ? 'text-gray-400' : 'text-[#030712]',
                            )}>
                              {comp.nome}
                            </p>
                            {locked && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                <Lock className="w-2.5 h-2.5" />
                                Capability inativa
                              </span>
                            )}
                            {!locked && ativasVisiveis.size > 0 && (
                              <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                                {ativasVisiveis.size}/{acoes.length}
                              </span>
                            )}
                          </div>
                          {comp.descricao && (
                            <p className={cn(
                              'text-xs leading-4 mt-0.5 truncate max-w-sm',
                              locked ? 'text-gray-400' : 'text-[#6b7280]',
                            )}>
                              {comp.descricao}
                            </p>
                          )}
                          {locked && capRequired && (
                            <p className="text-[10px] text-amber-600 mt-1 font-mono">
                              requer: capability:{capRequired}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* DocNix sem atribuições carregadas: permissões gerenciadas por objeto */}
                      {comp.tipoModelo === 'docnix' && acoes === ACOES['default'] && (
                        <div className="pl-8">
                          <p className="text-xs text-[#6b7280] italic">
                            Permissões gerenciadas por objeto — configure em{' '}
                            <strong className="text-[#030712]">Permissões → Objetos</strong>.
                          </p>
                        </div>
                      )}

                      {/* Checkboxes — desabilitados se bloqueado; ocultos para DocNix sem catálogo */}
                      {!(comp.tipoModelo === 'docnix' && acoes === ACOES['default']) && (
                      <div className="grid grid-cols-1 gap-1 pl-8">
                        {acoes.map(({ acao, label }) => {
                          const isHerited  = !!inheritedComp[acao]
                          const isDirect   = ativas.includes(acao)
                          const checked    = isDirect || isHerited
                          const grupoNome  = inheritedComp[acao]

                          // Herdada: aparece marcada mas não pode ser desmarcada
                          if (isHerited && !isDirect) {
                            return (
                              <div
                                key={acao}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50/60 select-none"
                                title={`Herdado do grupo "${grupoNome}"`}
                              >
                                <input
                                  type="checkbox"
                                  checked
                                  readOnly
                                  disabled
                                  className="w-4 h-4 rounded border-gray-300 cursor-default accent-emerald-600"
                                />
                                <span className="text-sm text-[#374151]">{label}</span>
                                <span className="ml-auto shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  <Users className="w-2.5 h-2.5" />
                                  {grupoNome}
                                </span>
                              </div>
                            )
                          }

                          // Direta (com ou sem herança adicional)
                          return (
                            <label
                              key={acao}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg select-none transition-colors',
                                locked
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'cursor-pointer hover:bg-gray-50',
                                !locked && checked && 'bg-blue-50/60 hover:bg-blue-50',
                                saving && 'pointer-events-none opacity-60',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => !locked && toggle(comp.id, acao)}
                                disabled={saving || locked}
                                className={cn(
                                  'w-4 h-4 rounded border-gray-300',
                                  locked ? 'cursor-not-allowed' : 'cursor-pointer accent-blue-600',
                                )}
                              />
                              <span className={cn(
                                'text-sm',
                                locked
                                  ? 'text-gray-400'
                                  : checked ? 'text-[#030712] font-medium' : 'text-[#374151]',
                              )}>
                                {label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                      )}
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
