/**
 * PermissoesMembroSheet — painel de permissões por membro (FGA puro).
 *
 * Todos os componentes usam component_permissions como backend de permissões.
 * A lista de ações disponíveis vem do banco via useComponenteConfig (papeis + acoes).
 * O papel selecionado é salvo em instancia_membros para exibição no badge.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { Loader2, Users } from 'lucide-react'
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
import type { InstanciaMembro } from '@/types'
import { useComponenteConfig } from '@/authz/hooks'

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
  accountId?: string
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
  accountId,
  onSaved,
}: Props) {
  const { config } = useComponenteConfig(componenteId, componenteNome)
  const entityNome = membro.displayName ?? membro.entidadeId

  // ── Papel selecionado ─────────────────────────────────────
  const [selectedPapel, setSelectedPapel] = useState(membro.papel ?? config.papeis[0]?.value ?? '')
  const [papelError,    setPapelError]    = useState<string | null>(null)

  // ── Combinar papéis (seleção múltipla) ────────────────────
  // Quando ativo, os cards de papel viram multi-seleção e o draft de ações
  // vira a união das ações padrão de todos os papéis marcados. Como
  // instancia_membros.papel só guarda um valor, o resultado é sempre
  // salvo como 'personalizado' — mesmo mecanismo já usado na edição manual.
  const [combinarPapeis,   setCombinarPapeis]   = useState(false)
  const [papeisCombinados, setPapeisCombinados] = useState<Set<string>>(new Set())

  // ── Ações (FGA puro) ──────────────────────────────────────
  const [saved,     setSaved]     = useState<string[]>([])
  const [draft,     setDraft]     = useState<string[]>([])
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Herança via grupos ────────────────────────────────────
  // acao → nome do grupo que concede a ação
  const [inherited, setInherited] = useState<Record<string, string>>({})

  // ── Catálogo de atribuições (banco) ──────────────────────
  // Ref sempre atualizado — permite leitura do valor atual dentro de closures de useEffect
  const atribuicoesNomesRef = useRef<string[]>([])
  const [atribuicoesNomes, setAtribuicoesNomes] = useState<string[]>([])
  useEffect(() => {
    if (!componenteId) return
    fetch(`/api/componentes/${componenteId}/atribuicoes`)
      .then(r => r.json())
      .then((data: any[]) => {
        const nomes = data.filter(a => a.status !== 'Inativo').map(a => a.nome as string)
        atribuicoesNomesRef.current = nomes
        setAtribuicoesNomes(nomes)
      })
      .catch(() => {})
  }, [componenteId])

  // Corrige o draft para papéis com defaultAcoes:[] assim que AMBOS os fetches terminam:
  // permissões (loading=false) e catálogo (atribuicoesNomes não vazio).
  // Sem isso, o fetch mais lento sobrescreve o resultado do mais rápido.
  useEffect(() => {
    if (loading || !open || atribuicoesNomes.length === 0) return
    if (selectedPapel === 'personalizado') return
    const papelDef = config.papeis.find(p => p.value === (membro.papel ?? ''))
    if (!papelDef || (papelDef.defaultAcoes ?? []).length > 0) return
    setDraft(atribuicoesNomes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, open, atribuicoesNomes])

  // ── Helpers ───────────────────────────────────────────────
  /** Expande defaultAcoes: [] (= Administrador) para todas as ações do catálogo */
  function expandDefaults(defaults: string[]): string[] {
    if (defaults.length > 0) return defaults
    // Prefere catálogo do banco (componente_atribuicoes) sobre mock hardcoded (componente_acoes)
    if (atribuicoesNomes.length > 0) return atribuicoesNomes
    return (config.acoes ?? []).map(a => a.acao)
  }

  // ── Carregamento ao abrir ─────────────────────────────────
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPapelError(null)
    setSaveError(null)
    setInherited({})
    setSelectedPapel(membro.papel ?? config.papeis[0]?.value ?? '')
    setCombinarPapeis(false)
    setPapeisCombinados(new Set())
    setLoading(true)

    api.getPermissions({
      entidade_tipo: membro.entidadeTipo === 'user' ? 'user' : 'group',
      entidade_id:   membro.entidadeId,
      instancia_id:  instanciaId,
    })
      .then((perms: any[]) => {
        const existing = perms.map((p: any) => p.acao as string)
        setSaved(existing)
        // Para Administrador (defaultAcoes: []) o draft deve ser todas as ações do catálogo.
        // Usa o ref para ler o valor atual mesmo se o fetch de atribuições já terminou.
        const papelDef = config.papeis.find(p => p.value === (membro.papel ?? ''))
        const isAdminAll = papelDef && (papelDef.defaultAcoes ?? []).length === 0
        const catalog = atribuicoesNomesRef.current
        if (isAdminAll && catalog.length > 0) {
          setDraft(catalog)
        } else {
          setDraft(existing)
        }
      })
      .catch(() => {
        const papelDef = config.papeis.find(p => p.value === membro.papel)
        setSaved([])
        setDraft(expandDefaults(papelDef?.defaultAcoes ?? []))
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    // ── Permissões herdadas via grupos (só para usuários) ──
    if (membro.entidadeTipo === 'user' && accountId) {
      api.getUserGrupos(membro.entidadeId, accountId)
        .then(async (userGrupos: any[]) => {
          if (cancelled || userGrupos.length === 0) return
          const grupoPerms = await Promise.all(
            userGrupos.map((g: any) =>
              api.getPermissions({ entidade_tipo: 'group', entidade_id: g.id, instancia_id: instanciaId })
                .then((perms: any[]) => ({ grupo: g, perms }))
                .catch(() => ({ grupo: g, perms: [] as any[] }))
            )
          )
          const inheritedMap: Record<string, string> = {}
          for (const { grupo, perms } of grupoPerms) {
            for (const p of perms) {
              if (!inheritedMap[p.acao]) inheritedMap[p.acao] = grupo.nome
            }
          }
          if (!cancelled) setInherited(inheritedMap)
        })
        .catch(() => {/* silencia — herdadas são informativas */})
    }

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, membro.id])

  // ── Mudança de papel ──────────────────────────────────────
  function handlePapelChange(novoPapel: string) {
    setSelectedPapel(novoPapel)
    const papelDef = config.papeis.find(p => p.value === novoPapel)
    if (!papelDef) { setDraft([]); return }
    setDraft(expandDefaults(papelDef.defaultAcoes ?? []))
  }

  /** União das ações padrão de um conjunto de papéis (usado no modo "Combinar papéis"). */
  function unionAcoesDosPapeis(valores: Set<string>): string[] {
    const acoes = new Set<string>()
    for (const valor of valores) {
      const papelDef = config.papeis.find(p => p.value === valor)
      if (!papelDef) continue
      expandDefaults(papelDef.defaultAcoes ?? []).forEach(a => acoes.add(a))
    }
    return [...acoes]
  }

  /**
   * Tenta reconstruir quais papéis foram combinados a partir do conjunto de ações salvo.
   * Necessário porque a combinação é persistida como papel='personalizado' (sem coluna
   * própria para guardar a lista) — ao reabrir, a única forma de "lembrar" a combinação
   * é comparar o conjunto de ações salvo contra a união de cada combinação possível de
   * papéis nomeados.
   *
   * Busca por tamanho crescente (1, 2, 3...) e retorna a MENOR combinação que bate
   * exatamente — isso evita ambiguidade quando Administrador (defaultAcoes: [] = todas
   * as ações) está envolvido: como Administrador sozinho já cobre o catálogo inteiro,
   * qualquer combinação "outro papel + Administrador" produziria a mesma união dele
   * sozinho, então sempre preferimos o papel único quando ele já basta.
   *
   * Retorna { papeis: Set com 1 item } para papel único, ou 2+ para combinação real.
   * Retorna null se nada bater exatamente (ex.: edição manual avulsa).
   */
  function inferirCombinacaoPapeis(existingAcoes: string[]): Set<string> | null {
    if (existingAcoes.length === 0) return null
    const existingSet = new Set(existingAcoes)
    const valores = config.papeis.map(p => p.value)
    const n = valores.length
    if (n > 12) return null // segurança: evita explosão combinatória

    const subsetsPorTamanho: string[][] = []
    for (let mask = 1; mask < (1 << n); mask++) {
      const subset: string[] = []
      for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(valores[i])
      subsetsPorTamanho.push(subset)
    }
    subsetsPorTamanho.sort((a, b) => a.length - b.length)

    for (const subset of subsetsPorTamanho) {
      const union = new Set(unionAcoesDosPapeis(new Set(subset)))
      if (union.size === existingSet.size && [...union].every(a => existingSet.has(a))) {
        return new Set(subset)
      }
    }
    return null
  }

  // Ao abrir com papel salvo como 'personalizado', tenta reconstruir se ele veio de uma
  // combinação de papéis (em vez de edição manual avulsa) e reativa o modo Combinar papéis.
  // Se a menor combinação encontrada tiver só 1 papel, mostra como seleção única normal
  // (não faz sentido ligar "Combinar papéis" para um único papel).
  useEffect(() => {
    if (loading || !open || atribuicoesNomes.length === 0) return
    if ((membro.papel ?? '') !== 'personalizado') return
    if (combinarPapeis) return // já está em modo combinar (ex.: usuário acabou de togglear)
    const combinacao = inferirCombinacaoPapeis(saved)
    if (!combinacao) return
    if (combinacao.size === 1) {
      setSelectedPapel([...combinacao][0])
    } else {
      setCombinarPapeis(true)
      setPapeisCombinados(combinacao)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, open, atribuicoesNomes, saved])

  function handleTogglePapelCombinado(papelValue: string) {
    setPapeisCombinados(prev => {
      const next = new Set(prev)
      if (next.has(papelValue)) next.delete(papelValue)
      else next.add(papelValue)
      return next
    })
    setSelectedPapel('personalizado')
  }

  // Recalcula o draft sempre que o conjunto de papéis combinados mudar
  // (evita chamar setDraft dentro do updater de setPapeisCombinados).
  // Conjunto vazio não mexe no draft — evita apagar edições manuais ao
  // ligar o modo "Combinar papéis" sem nenhum papel ainda marcado.
  useEffect(() => {
    if (!combinarPapeis || papeisCombinados.size === 0) return
    setDraft(unionAcoesDosPapeis(papeisCombinados))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papeisCombinados, combinarPapeis])

  function handleToggleCombinarPapeis() {
    setCombinarPapeis(prev => {
      const next = !prev
      if (next) {
        // Ativando: parte do papel único já selecionado, se houver
        const seed = selectedPapel && selectedPapel !== 'personalizado' ? new Set([selectedPapel]) : new Set<string>()
        setPapeisCombinados(seed)
      } else {
        // Desativando: se sobrou exatamente um papel combinado, volta pro modo single-select
        if (papeisCombinados.size === 1) {
          setSelectedPapel([...papeisCombinados][0])
        }
        setPapeisCombinados(new Set())
      }
      return next
    })
  }

  function toggleItem(acao: string) {
    if (inherited[acao]) return // herdadas são read-only
    setSelectedPapel('personalizado')
    setDraft(prev => prev.includes(acao) ? prev.filter(x => x !== acao) : [...prev, acao])
  }

  const hasChanges = useMemo(() => {
    const o = new Set(saved)
    if (draft.length !== saved.length) return true
    return draft.some(a => !o.has(a))
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
    const toAdd    = draft.filter(a => !savedSet.has(a))
    const toRemove = saved.filter(a => !draftSet.has(a))

    try {
      const papelParaSalvar = selectedPapel === 'personalizado' ? 'personalizado' : selectedPapel
      if (papelParaSalvar && papelParaSalvar !== membro.papel) {
        await api.updateInstanciaMembro(instanciaId, membro.id, papelParaSalvar).catch(() => null)
      }

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

      setSaved([...draft])
      onSaved?.()
      handleClose()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const hasInherited = Object.keys(inherited).length > 0
  const diretasCount = draft.filter(a => !inherited[a]).length

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[520px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Ações — {entityNome}</NestedSheetTitle>
        <NestedSheetDescription>
          {membro.entidadeTipo === 'group' ? `Grupo · ${instanciaNome}` : instanciaNome}
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody noPadding>
        <div className="h-full px-6 py-5 flex flex-col gap-5">

          {/* ── Banner herança via grupo ────────────────────── */}
          {!loading && hasInherited && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 shrink-0">
              <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800">
                Algumas ações estão marcadas via <strong>grupo</strong> — são somente leitura.
              </p>
            </div>
          )}

          {/* ── Cards de papel ─────────────────────────────── */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Papel</p>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <span className="text-[11px] font-medium text-gray-500">Combinar papéis</span>
                <button
                  type="button"
                  onClick={handleToggleCombinarPapeis}
                  className={cn(
                    'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors',
                    combinarPapeis ? 'bg-blue-600' : 'bg-gray-300',
                  )}
                >
                  <span className={cn(
                    'inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform',
                    combinarPapeis ? 'translate-x-3.5' : 'translate-x-0.5',
                  )} />
                </button>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {config.papeis.map(p => {
                const isSelected = combinarPapeis ? papeisCombinados.has(p.value) : selectedPapel === p.value
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => combinarPapeis ? handleTogglePapelCombinado(p.value) : handlePapelChange(p.value)}
                    className={cn(
                      'flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50',
                    )}
                  >
                    <span className="text-xs font-medium text-gray-900">{p.label}</span>
                  </button>
                )
              })}

              {/* Card "Personalizado" — seleção manual livre */}
              <button
                type="button"
                onClick={() => {
                  if (combinarPapeis) { setPapeisCombinados(new Set()) }
                  setSelectedPapel('personalizado')
                }}
                className={cn(
                  'flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-colors',
                  (combinarPapeis ? papeisCombinados.size === 0 : selectedPapel === 'personalizado')
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:bg-gray-50',
                )}
              >
                <span className="text-xs font-medium text-gray-900">Personalizado</span>
                <span className="text-[10px] text-gray-500 mt-0.5 leading-tight">Selecionar manualmente</span>
              </button>
            </div>
            {combinarPapeis && papeisCombinados.size > 1 && (
              <p className="text-[11px] text-blue-600">
                Ações combinadas de {papeisCombinados.size} papéis — ajuste manualmente na lista abaixo se necessário.
              </p>
            )}
            {papelError && <p className="text-xs text-red-600">{papelError}</p>}
          </div>

          {/* ── Lista de ações ─────────────────────────────── */}
          <div className="flex flex-col flex-1 min-h-0 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0">Ações</p>

            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : (atribuicoesNomes.length === 0 && (config.acoes ?? []).length === 0) ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Nenhuma ação cadastrada para este componente.
              </p>
            ) : (
              <>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 flex-1 min-h-0 overflow-y-auto">
                  {(atribuicoesNomes.length > 0
                    ? atribuicoesNomes.map(n => ({ acao: n, label: n }))
                    : (config.acoes ?? [])
                  ).map(({ acao, label }) => {
                    const isInherited = !!inherited[acao]
                    const grupoNome   = inherited[acao]

                    if (isInherited) {
                      return (
                        <div
                          key={acao}
                          className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50/60 select-none"
                          title={`Herdado do grupo "${grupoNome}"`}
                        >
                          <input
                            type="checkbox"
                            checked
                            readOnly
                            disabled
                            className="w-4 h-4 rounded border-gray-300 cursor-default accent-emerald-600 shrink-0"
                          />
                          <span className="text-sm font-medium text-gray-900 flex-1">{label}</span>
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <Users className="w-2.5 h-2.5" />
                            {grupoNome}
                          </span>
                        </div>
                      )
                    }

                    return (
                      <label
                        key={acao}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors',
                          saving && 'opacity-60 pointer-events-none',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={draft.includes(acao)}
                          disabled={saving}
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
                    )
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      </NestedSheetBody>

      <NestedSheetFooter>
        {(saveError || papelError) ? (
          <p className="text-xs text-red-600 flex-1 mr-2">{saveError ?? papelError}</p>
        ) : !loading && (
          <p className="text-xs text-gray-400 flex-1 mr-2">
            <strong className="text-gray-600">{diretasCount}</strong> {diretasCount === 1 ? 'ação direta' : 'ações diretas'}
            {hasInherited && (
              <span className="text-emerald-600 ml-1">
                + <strong>{Object.keys(inherited).length}</strong> via grupo
              </span>
            )}
          </p>
        )}
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSalvar} disabled={!hasChanges || saving || loading}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
