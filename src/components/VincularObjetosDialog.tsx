import { useState, useEffect, useMemo } from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import { api } from '@/api/client'
import type { ComponenteObjeto, GrupoPermissao, Componente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  grupoId: string
  permissoesExistentes: GrupoPermissao[]
  onSave: () => void
}

interface ObjetoState {
  objeto: ComponenteObjeto
  componente: Componente
  permissoesAtivas: string[]
  expandido: boolean
}

export function VincularObjetosDialog({ open, onClose, grupoId, permissoesExistentes, onSave }: Props) {
  const [objetosState, setObjetosState] = useState<ObjetoState[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([api.getComponenteObjetos(), api.getComponentes()]).then(([objetos, componentes]) => {
      const state: ObjetoState[] = objetos.map((obj: ComponenteObjeto) => {
        const comp = componentes.find((c: Componente) => c.id === obj.componenteId)
        const existente = permissoesExistentes.find(p => p.componenteObjetoId === obj.id)
        return {
          objeto: obj,
          componente: comp,
          permissoesAtivas: (existente?.permissoesAtivas as string[]) ?? [],
          expandido: !!existente,
        }
      })
      setObjetosState(state)
      setLoading(false)
    })
  }, [open, permissoesExistentes])

  // Agrupa por componente para exibição
  const porComponente = useMemo(() => {
    const map = new Map<string, { componente: Componente; objetos: ObjetoState[] }>()
    for (const item of objetosState) {
      const compId = item.objeto.componenteId
      if (!map.has(compId)) {
        map.set(compId, { componente: item.componente, objetos: [] })
      }
      map.get(compId)!.objetos.push(item)
    }
    return Array.from(map.values())
  }, [objetosState])

  function togglePermissao(objetoId: string, permId: string) {
    setObjetosState(prev => prev.map(item => {
      if (item.objeto.id !== objetoId) return item
      const ativas = item.permissoesAtivas.includes(permId)
        ? item.permissoesAtivas.filter(id => id !== permId)
        : [...item.permissoesAtivas, permId]
      return { ...item, permissoesAtivas: ativas }
    }))
  }

  function toggleExpandido(objetoId: string) {
    setObjetosState(prev => prev.map(item =>
      item.objeto.id === objetoId ? { ...item, expandido: !item.expandido } : item
    ))
  }

  async function handleSave() {
    setSaving(true)
    // Salva somente objetos que têm pelo menos uma permissão ativa
    const comPermissoes = objetosState.filter(o => o.permissoesAtivas.length > 0)
    await Promise.all(comPermissoes.map(o =>
      api.salvarPermissaoGrupo(grupoId, {
        componenteObjetoId: o.objeto.id,
        permissoesAtivas: o.permissoesAtivas,
      })
    ))
    setSaving(false)
    onSave()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Vincular objetos"
      description="Selecione os objetos e configure as permissões para este grupo."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Salvar permissões'}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-6">Carregando objetos disponíveis...</p>
      ) : porComponente.length === 0 ? (
        <div className="flex flex-col gap-2 py-6 text-center">
          <p className="text-sm font-medium text-gray-600">Nenhum objeto disponível</p>
          <p className="text-xs text-gray-400">
            Para vincular objetos, os componentes precisam ter sua metadata importada.<br />
            Acesse a tela de Componentes e clique em "Importar metadata".
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {porComponente.map(({ componente, objetos }) => (
            <div key={componente?.id ?? 'unknown'} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Header do componente */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm font-semibold text-[#030712]">{componente?.nome ?? 'Componente desconhecido'}</p>
                {componente?.descricao && (
                  <p className="text-xs text-gray-400 mt-0.5">{componente.descricao}</p>
                )}
              </div>

              {/* Objetos do componente */}
              <div className="divide-y divide-gray-100">
                {objetos.map(item => (
                  <div key={item.objeto.id}>
                    {/* Linha do objeto */}
                    <button
                      type="button"
                      onClick={() => toggleExpandido(item.objeto.id)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        {item.expandido
                          ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        }
                        <div>
                          <p className="text-sm font-medium text-[#030712]">{item.objeto.nome}</p>
                          {item.objeto.descricao && (
                            <p className="text-xs text-gray-400">{item.objeto.descricao}</p>
                          )}
                        </div>
                      </div>
                      {item.permissoesAtivas.length > 0 && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                          {item.permissoesAtivas.length} permiss{item.permissoesAtivas.length === 1 ? 'ão' : 'ões'}
                        </span>
                      )}
                    </button>

                    {/* Permissões do objeto */}
                    {item.expandido && (
                      <div className="px-10 pb-3 pt-1 flex flex-wrap gap-2">
                        {item.objeto.permissoesDisponiveis.map(perm => {
                          const ativa = item.permissoesAtivas.includes(perm.id)
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => togglePermissao(item.objeto.id, perm.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                                ativa
                                  ? 'bg-[#030712] text-white border-[#030712]'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {ativa && <Check className="w-3 h-3" />}
                              {perm.nome}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  )
}
