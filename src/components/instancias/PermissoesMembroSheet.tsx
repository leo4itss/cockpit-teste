/**
 * PermissoesMembroSheet — painel de permissões por membro (FGA puro).
 *
 * Todos os componentes usam component_permissions como backend de permissões.
 * A lista de ações disponíveis vem de config.acoes (getComponenteConfig).
 * O papel selecionado é salvo em instancia_membros para exibição no badge.
 */

import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
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
  onSaved,
}: Props) {
  const config     = useMemo(() => getComponenteConfig(componenteNome), [componenteNome])
  const entityNome = membro.displayName ?? membro.entidadeId

  // ── Papel selecionado ─────────────────────────────────────
  const [selectedPapel, setSelectedPapel] = useState(membro.papel ?? config.papeis[0]?.value ?? '')
  const [papelError,    setPapelError]    = useState<string | null>(null)

  // ── Ações (FGA puro) ──────────────────────────────────────
  const [saved,     setSaved]     = useState<string[]>([])
  const [draft,     setDraft]     = useState<string[]>([])
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Helpers ───────────────────────────────────────────────
  /** Expande defaultAcoes: [] (= Administrador) para todas as ações do catálogo */
  function expandDefaults(defaults: string[]): string[] {
    if (defaults.length > 0) return defaults
    return (config.acoes ?? []).map(a => a.acao)
  }

  // ── Carregamento ao abrir ─────────────────────────────────
  useEffect(() => {
    if (!open) return
    setPapelError(null)
    setSaveError(null)
    setSelectedPapel(membro.papel ?? config.papeis[0]?.value ?? '')
    setLoading(true)

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
          const defaults = expandDefaults(papelDef?.defaultAcoes ?? [])
          setSaved([])
          setDraft(defaults)
        }
      })
      .catch(() => {
        const papelDef = config.papeis.find(p => p.value === membro.papel)
        setSaved([])
        setDraft(expandDefaults(papelDef?.defaultAcoes ?? []))
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, membro.id])

  // ── Mudança de papel ──────────────────────────────────────
  function handlePapelChange(novoPapel: string) {
    setSelectedPapel(novoPapel)
    const papelDef = config.papeis.find(p => p.value === novoPapel)
    if (!papelDef) { setDraft([]); return }
    setDraft(expandDefaults(papelDef.defaultAcoes ?? []))
  }

  function toggleItem(acao: string) {
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
      // Atualiza papel no membership (para exibição no badge)
      const papelParaSalvar = selectedPapel === 'personalizado' ? 'personalizado' : selectedPapel
      if (papelParaSalvar && papelParaSalvar !== membro.papel) {
        await api.updateInstanciaMembro(instanciaId, membro.id, papelParaSalvar).catch(() => null)
      }

      // Sincroniza permissões granulares em component_permissions
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

  const diretasCount = draft.length

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[520px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Ações — {entityNome}</NestedSheetTitle>
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

              {/* Card "Personalizado" — seleção manual livre */}
              <button
                type="button"
                onClick={() => { setSelectedPapel('personalizado') }}
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
            </div>
            {papelError && <p className="text-xs text-red-600">{papelError}</p>}
          </div>

          {/* ── Lista de ações ─────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</p>

            {loading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
              </div>
            ) : (config.acoes ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                Nenhuma ação cadastrada para este componente.
              </p>
            ) : (
              <>
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[min(50vh,380px)] overflow-y-auto">
                  {(config.acoes ?? []).map(({ acao, label }) => (
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
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  <strong className="text-gray-600">{diretasCount}</strong> ação{diretasCount !== 1 ? 'ões' : ''} selecionada{diretasCount !== 1 ? 's' : ''}
                </p>
              </>
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
