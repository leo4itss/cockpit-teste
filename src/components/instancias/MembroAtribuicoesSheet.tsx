import { useState, useEffect, useMemo } from 'react'
import { Search, Users, Loader2, Lock } from 'lucide-react'
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

interface Props {
  open: boolean
  onClose: () => void
  instanciaId: string
  instanciaNome: string
  componenteId: string
  membro: InstanciaMembro
  /** id do grupo → nome (para badge "Via Grupo") */
  grupoNomes?: Record<string, string>
  onSaved?: () => void
}

/** Atribuições herdadas via grupo — somente leitura (usuários). */
type GrupoHerdada = { atribuicaoId: string; grupoId: string }

export function MembroAtribuicoesSheet({
  open,
  onClose,
  instanciaId,
  instanciaNome,
  componenteId,
  membro,
  grupoNomes = {},
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [catalog, setCatalog] = useState<Atribuicao[]>([])
  const [original, setOriginal] = useState<string[]>([])
  const [draft, setDraft] = useState<string[]>([])
  const [herdadasGrupo, setHerdadasGrupo] = useState<GrupoHerdada[]>([])

  const isUser = membro.entidadeTipo === 'user'
  const entityNome = membro.displayName ?? membro.entidadeId

  useEffect(() => {
    if (!open || !membro.id) return
    let cancelled = false
    setLoading(true)
    setSaveError(null)
    setSearch('')
    setHerdadasGrupo([])

    const efetivasFetch = isUser
      ? api.getPermissoesEfetivas(instanciaId, membro.entidadeId).catch(() => ({
          atribuicoes: [] as string[],
          fontes: [] as { atribuicaoId: string; fonte: string; entidadeId: string }[],
        }))
      : Promise.resolve(null)

    Promise.all([
      api.getAtribuicoes(componenteId),
      api.getMembroAtribuicoes(instanciaId, membro.id),
      efetivasFetch,
    ])
      .then(([atribs, vinculos, efetivas]) => {
        if (cancelled) return
        const ativas = (atribs as Atribuicao[]).filter(a => a.status === 'Ativo')
        setCatalog(ativas)

        const diretas = (vinculos as { atribuicaoId: string }[]).map(v => v.atribuicaoId)
        setOriginal(diretas)
        setDraft([...diretas])

        if (efetivas && isUser) {
          const fromGrupo = efetivas.fontes
            .filter(f => f.fonte === 'grupo')
            .map(f => ({ atribuicaoId: f.atribuicaoId, grupoId: f.entidadeId }))
          setHerdadasGrupo(fromGrupo)
        }
      })
      .catch(() => {
        if (!cancelled) setSaveError('Não foi possível carregar as atribuições.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [open, membro.id, membro.entidadeId, instanciaId, componenteId, isUser])

  const herdadasSet = useMemo(
    () => new Set(herdadasGrupo.map(h => h.atribuicaoId)),
    [herdadasGrupo],
  )

  const herdadaPorAtrib = useMemo(() => {
    const map: Record<string, GrupoHerdada[]> = {}
    for (const h of herdadasGrupo) {
      if (!map[h.atribuicaoId]) map[h.atribuicaoId] = []
      map[h.atribuicaoId].push(h)
    }
    return map
  }, [herdadasGrupo])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      a =>
        a.nome.toLowerCase().includes(q) ||
        (a.modulo ?? '').toLowerCase().includes(q) ||
        (a.descricao ?? '').toLowerCase().includes(q),
    )
  }, [catalog, search])

  const hasChanges = useMemo(() => {
    const o = new Set(original)
    if (draft.length !== original.length) return true
    return draft.some(id => !o.has(id))
  }, [original, draft])

  function toggle(atribuicaoId: string) {
    if (herdadasSet.has(atribuicaoId) && !draft.includes(atribuicaoId)) return
    setDraft(prev =>
      prev.includes(atribuicaoId)
        ? prev.filter(id => id !== atribuicaoId)
        : [...prev, atribuicaoId],
    )
  }

  function handleClose() {
    setSearch('')
    setSaveError(null)
    onClose()
  }

  async function handleSalvar() {
    setSaving(true)
    setSaveError(null)
    const origSet = new Set(original)
    const draftSet = new Set(draft)
    try {
      const toAdd = draft.filter(id => !origSet.has(id))
      const toRemove = original.filter(id => !draftSet.has(id))
      await Promise.all([
        ...toAdd.map(id => api.addMembroAtribuicao(instanciaId, membro.id, id)),
        ...toRemove.map(id => api.removeMembroAtribuicao(instanciaId, membro.id, id)),
      ])
      setOriginal([...draft])
      onSaved?.()
      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar atribuições.'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const diretasCount = draft.length
  const herdadasCount = [...herdadasSet].filter(id => !draft.includes(id)).length

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[520px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Atribuições — {entityNome}</NestedSheetTitle>
        <NestedSheetDescription>
          {instanciaNome}
          {isUser ? (
            <> · marque o que este usuário recebe <strong>diretamente</strong> na instância.</>
          ) : (
            <> · atribuições concedidas a este grupo na instância.</>
          )}
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody noPadding>
        {isUser && herdadasGrupo.length > 0 && (
          <div className="flex items-start gap-3 mx-6 mt-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50">
            <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">
              Itens marcados como <strong>Via Grupo</strong> vêm de grupos dos quais o usuário faz parte.
              Para alterá-los, edite as atribuições do grupo correspondente nesta instância.
            </p>
          </div>
        )}

        <div className="px-6 py-4">
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

        <div className="flex-1 overflow-y-auto border-t border-gray-100 max-h-[min(60vh,480px)]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              {search ? 'Nenhuma atribuição encontrada.' : 'Nenhuma atribuição cadastrada para este componente.'}
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(a => {
                const herdadas = herdadaPorAtrib[a.id] ?? []
                const soHerdada = herdadas.length > 0 && !draft.includes(a.id)
                const checked = draft.includes(a.id) || soHerdada
                const readOnlyGrupo = soHerdada

                return (
                  <div
                    key={a.id}
                    className={cn(
                      'px-6 py-2.5',
                      readOnlyGrupo && 'bg-emerald-50/40',
                    )}
                  >
                    <label
                      className={cn(
                        'flex items-start gap-2.5',
                        readOnlyGrupo ? 'cursor-default' : 'cursor-pointer',
                        saving && 'opacity-60 pointer-events-none',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnlyGrupo || saving}
                        onChange={() => !readOnlyGrupo && toggle(a.id)}
                        className={cn(
                          'mt-0.5 w-4 h-4 rounded border-gray-300 shrink-0',
                          readOnlyGrupo ? 'accent-emerald-600 cursor-default' : 'accent-blue-600',
                        )}
                      />
                      <span className="flex-1 min-w-0">
                        <span className={cn('text-sm', checked ? 'font-medium text-gray-900' : 'text-gray-700')}>
                          {a.nome}
                        </span>
                        {a.modulo && (
                          <span className="ml-1.5 text-xs text-gray-400">({a.modulo})</span>
                        )}
                        {readOnlyGrupo && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {herdadas.map((h, i) => (
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

        {!loading && catalog.length > 0 && (
          <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            <strong className="text-gray-700">{diretasCount}</strong> direta{diretasCount !== 1 ? 's' : ''}
            {isUser && herdadasCount > 0 && (
              <> · <strong className="text-gray-700">{herdadasCount}</strong> só via grupo</>
            )}
          </div>
        )}
      </NestedSheetBody>

      <NestedSheetFooter>
        {saveError && <p className="text-xs text-red-600 flex-1 mr-2">{saveError}</p>}
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSalvar} disabled={!hasChanges || saving || loading}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
