/**
 * PermissoesMembroSheet — painel de permissões por membro, unificado por tipo de componente.
 *
 * Todos os componentes seguem a mesma metodologia FGA; o que varia é o contrato de
 * papéis e ações de cada tipo. A configuração é obtida via getComponenteConfig(nome).
 *
 * permissaoMode:
 *   'atribuicoes'           → ações salvas em instancia_membro_atribuicoes (ex: MaxDoc, DocAction)
 *   'component_permissions' → ações salvas em component_permissions (ex: Assistente IA, Analytics)
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
import { getComponenteConfig } from '@/authz/mock'

// ── Props ─────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  instanciaId: string
  instanciaNome: string
  componenteId: string
  componenteNome?: string
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
  membro,
  grupoNomes = {},
  onSaved,
}: Props) {
  const config      = useMemo(() => getComponenteConfig(componenteNome), [componenteNome])
  const usaAtrib    = config.permissaoMode === 'atribuicoes'
  const entityNome  = membro.displayName ?? membro.entidadeId
  const isUser      = membro.entidadeTipo === 'user'

  // ── Papel selecionado ─────────────────────────────────────
  const [selectedPapel, setSelectedPapel] = useState(membro.papel ?? config.papeis[0]?.value ?? '')
  const [papelError,    setPapelError]    = useState<string | null>(null)

  // ── Ações / Atribuições ───────────────────────────────────
  // Para ambos os modos: 'saved' = estado original (DB), 'draft' = edição atual
  const [saved,      setSaved]      = useState<string[]>([])   // IDs ou acao keys
  const [draft,      setDraft]      = useState<string[]>([])
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)

  // Apenas para modo 'atribuicoes': catálogo completo + herança via grupo
  type GrupoHerdada = { atribuicaoId: string; grupoId: string }
  const [catalog,   setCatalog]   = useState<Atribuicao[]>([])
  const [herdadas,  setHerdadas]  = useState<GrupoHerdada[]>([])

  // ── Reset ao abrir ────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setPapelError(null)
    setSaveError(null)
    setSelectedPapel(membro.papel ?? config.papeis[0]?.value ?? '')

    setLoading(true)

    if (usaAtrib) {
      // Modo atribuicoes: carrega catálogo + vínculos do membro
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
          setSaved(diretas)
          setDraft([...diretas])

          // Tenta detectar qual papel corresponde às atribuições salvas
          const papelMatch = config.papeis.find(p => p.value === membro.papel)
          setSelectedPapel(papelMatch ? papelMatch.value : 'personalizado')

          if (efetivas && isUser) {
            const fromGrupo = (efetivas as any).fontes
              .filter((f: { fonte: string }) => f.fonte === 'grupo')
              .map((f: { atribuicaoId: string; entidadeId: string }) => ({
                atribuicaoId: f.atribuicaoId,
                grupoId: f.entidadeId,
              }))
            setHerdadas(fromGrupo)
          }
        })
        .finally(() => setLoading(false))
    } else {
      // Modo component_permissions: carrega permissões granulares salvas
      api.getPermissions({
        entidade_tipo: membro.entidadeTipo === 'user' ? 'user' : 'group',
        entidade_id:   membro.entidadeId,
        instancia_id:  instanciaId,
      })
        .then((perms: any[]) => {
          const existing = perms.map((p: any) => p.acao as string)
          if (existing.length > 0) {
            setSaved(existing)
            setDraft(existing)
          } else {
            // Sem permissões salvas: aplica defaults do papel atual
            const papelDef = config.papeis.find(p => p.value === membro.papel)
            const defaults = papelDef?.defaultAcoes ?? []
            setSaved([])
            setDraft(defaults)
          }
        })
        .catch(() => {
          const papelDef = config.papeis.find(p => p.value === membro.papel)
          setSaved([])
          setDraft(papelDef?.defaultAcoes ?? [])
        })
        .finally(() => setLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, membro.id])

  // ── Helpers herança ───────────────────────────────────────
  const herdadasSet = useMemo(() => new Set(herdadas.map(h => h.atribuicaoId)), [herdadas])
  const herdadaPorAtrib = useMemo(() => {
    const map: Record<string, GrupoHerdada[]> = {}
    for (const h of herdadas) {
      if (!map[h.atribuicaoId]) map[h.atribuicaoId] = []
      map[h.atribuicaoId].push(h)
    }
    return map
  }, [herdadas])

  // ── Mudança de papel ──────────────────────────────────────
  function handlePapelChange(novoPapel: string) {
    setSelectedPapel(novoPapel)
    const papelDef = config.papeis.find(p => p.value === novoPapel)
    if (!papelDef) { setDraft([]); return }

    if (usaAtrib) {
      const ativas = catalog.filter(a => a.status === 'Ativo')
      const novas = papelDef.atribuicaoNomes?.length === 0
        ? ativas.map(a => a.id)
        : ativas.filter(a => (papelDef.atribuicaoNomes ?? []).includes(a.nome)).map(a => a.id)
      setDraft(novas)
    } else {
      setDraft(papelDef.defaultAcoes ?? [])
    }
  }

  // Ao alterar manualmente → volta para "Personalizado" (só no modo atribuicoes)
  function toggleItem(id: string) {
    if (usaAtrib) {
      const soHerdada = herdadasSet.has(id) && !draft.includes(id)
      if (soHerdada) return
      setSelectedPapel('personalizado')
    }
    setDraft(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const hasChanges = useMemo(() => {
    const o = new Set(saved)
    if (draft.length !== saved.length) return true
    return draft.some(id => !o.has(id))
  }, [saved, draft])

  function handleClose() {
    setSaveError(null)
    setPapelError(null)
    onClose()
  }

  async function handleSalvar() {
    setSaving(true)
    setSaveError(null)
    setPapelError(null)

    const savedSet = new Set(saved)
    const draftSet = new Set(draft)
    const toAdd    = draft.filter(id => !savedSet.has(id))
    const toRemove = saved.filter(id => !draftSet.has(id))

    try {
      if (usaAtrib) {
        await Promise.all([
          ...toAdd.map(id => api.addMembroAtribuicao(instanciaId, membro.id, id)),
          ...toRemove.map(id => api.removeMembroAtribuicao(instanciaId, membro.id, id)),
        ])
      } else {
        // Salva papel no membership
        await api.addInstanciaMembro(instanciaId, {
          entidadeTipo: membro.entidadeTipo,
          entidadeId:   membro.entidadeId,
          papel:        selectedPapel,
        })
        // Sincroniza permissões granulares
        const entidadeTipo = membro.entidadeTipo === 'user' ? 'user' : 'group'
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
      }
      setSaved([...draft])
      onSaved?.()
      handleClose()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const multiSecao = usaAtrib  // só DocNix usa "AÇÕES DA INSTÂNCIA" como seção separada
  const diretasCount  = draft.length
  const herdadasCount = [...herdadasSet].filter(id => !draft.includes(id)).length

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[520px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Permissões — {entityNome}</NestedSheetTitle>
        <NestedSheetDescription>
          {membro.entidadeTipo === 'group' ? `Grupo · ${instanciaNome}` : instanciaNome}
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody noPadding>
        <div className="px-6 py-5 space-y-5">

          {/* ── Cards de papel ─────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Papel</p>
            <div className="grid grid-cols-3 gap-1.5">
              {config.papeis.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePapelChange(p.value)}
                  className={cn(
                    'flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors',
                    selectedPapel === p.value
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50',
                  )}
                >
                  <span className="text-xs font-medium text-gray-900">{p.label}</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">{p.desc}</span>
                </button>
              ))}

              {/* Card "Personalizado" — apenas modo atribuicoes */}
              {usaAtrib && (
                <button
                  type="button"
                  onClick={() => { setSelectedPapel('personalizado'); setDraft([]) }}
                  className={cn(
                    'flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors',
                    selectedPapel === 'personalizado'
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50',
                  )}
                >
                  <span className="text-xs font-medium text-gray-900">Personalizado</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">Selecionar manualmente</span>
                </button>
              )}
            </div>
            {papelError && <p className="text-xs text-red-600">{papelError}</p>}
          </div>

          {/* ── Aviso de herança via grupo (só atribuicoes) ── */}
          {usaAtrib && isUser && herdadas.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
              <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">
                Itens marcados com <strong>Via Grupo</strong> vêm de grupos do usuário
                e não podem ser alterados aqui.
              </p>
            </div>
          )}

          {/* ── Ações / Atribuições ────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {multiSecao ? 'Ações da instância' : 'Ações'}
            </p>

            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : usaAtrib ? (
              /* Modo atribuicoes: lista do catálogo */
              catalog.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  Nenhuma ação cadastrada para este componente.
                </p>
              ) : (
                <>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[min(50vh,380px)] overflow-y-auto">
                    {catalog.map(a => {
                      const herdadasDesteAtrib = herdadaPorAtrib[a.id] ?? []
                      const soHerdada = herdadasDesteAtrib.length > 0 && !draft.includes(a.id)
                      const checked   = draft.includes(a.id) || soHerdada
                      return (
                        <div key={a.id} className={cn('px-4', soHerdada && 'bg-emerald-50/40')}>
                          <label className={cn(
                            'flex items-start gap-3 py-2.5',
                            soHerdada ? 'cursor-default' : 'cursor-pointer',
                            saving && 'opacity-60 pointer-events-none',
                          )}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={soHerdada || saving}
                              onChange={() => !soHerdada && toggleItem(a.id)}
                              className={cn(
                                'mt-0.5 w-4 h-4 rounded border-gray-300 shrink-0',
                                soHerdada ? 'accent-emerald-600' : 'accent-blue-600',
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
                                    <span key={`${h.grupoId}-${i}`}
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
                  {catalog.length > 0 && (
                    <p className="text-xs text-gray-400">
                      <strong className="text-gray-600">{diretasCount}</strong> ação{diretasCount !== 1 ? 'ões' : ''} selecionada{diretasCount !== 1 ? 's' : ''}
                      {isUser && herdadasCount > 0 && (
                        <> · <strong className="text-gray-600">{herdadasCount}</strong> só via grupo</>
                      )}
                    </p>
                  )}
                </>
              )
            ) : (
              /* Modo component_permissions: lista de ações fixas */
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {(config.acoes ?? []).map(({ acao, label }) => (
                  <label
                    key={acao}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={draft.includes(acao)}
                      onChange={() => toggleItem(acao)}
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600 shrink-0"
                    />
                    <span className={cn(
                      'text-sm flex-1',
                      draft.includes(acao) ? 'font-medium text-gray-900' : 'text-gray-500',
                    )}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

        </div>
      </NestedSheetBody>

      <NestedSheetFooter>
        {(saveError || papelError) && (
          <p className="text-xs text-red-600 flex-1 mr-2">{saveError ?? papelError}</p>
        )}
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSalvar} disabled={!hasChanges || saving || loading}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
