import { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
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
  componente: Componente | undefined
  permissoesAtivas: string[]
}

export function VincularObjetosDialog({ open, onClose, grupoId, permissoesExistentes, onSave }: Props) {
  const [objetosState, setObjetosState] = useState<ObjetoState[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setSearch('')
    setLoading(true)
    Promise.all([api.getComponenteObjetos(), api.getComponentes()]).then(([objetos, componentes]) => {
      const state: ObjetoState[] = objetos.map((obj: ComponenteObjeto) => {
        const comp = componentes.find((c: Componente) => c.id === obj.componenteId)
        const existente = permissoesExistentes.find(p => p.componenteObjetoId === obj.id)
        return {
          objeto: obj,
          componente: comp,
          permissoesAtivas: (existente?.permissoesAtivas as string[]) ?? [],
        }
      })
      setObjetosState(state)
      setLoading(false)
    })
  }, [open, permissoesExistentes])

  const filtrado = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return objetosState
    return objetosState.filter(item =>
      item.objeto.nome.toLowerCase().includes(q) ||
      (item.componente?.nome ?? '').toLowerCase().includes(q)
    )
  }, [objetosState, search])

  const porComponente = useMemo(() => {
    const map = new Map<string, { componente: Componente | undefined; objetos: ObjetoState[] }>()
    for (const item of filtrado) {
      const compId = item.objeto.componenteId
      if (!map.has(compId)) {
        map.set(compId, { componente: item.componente, objetos: [] })
      }
      map.get(compId)!.objetos.push(item)
    }
    return Array.from(map.values())
  }, [filtrado])

  function togglePermissao(objetoId: string, permId: string) {
    setObjetosState(prev => prev.map(item => {
      if (item.objeto.id !== objetoId) return item
      const ativas = item.permissoesAtivas.includes(permId)
        ? item.permissoesAtivas.filter(id => id !== permId)
        : [...item.permissoesAtivas, permId]
      return { ...item, permissoesAtivas: ativas }
    }))
  }

  async function handleSave() {
    setSaving(true)
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl flex flex-col w-full max-w-4xl mx-4 max-h-[90vh]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded text-gray-400 hover:text-gray-600 opacity-70"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <p className="text-lg font-semibold text-[#030712]">Vincular objetos</p>
        </div>

        {/* Subheader with search */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <p className="text-base font-medium text-[#030712]">
            {objetosState.filter(o => o.permissoesAtivas.length > 0).length} objeto{objetosState.filter(o => o.permissoesAtivas.length > 0).length !== 1 ? 's' : ''} configurado{objetosState.filter(o => o.permissoesAtivas.length > 0).length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md">
            <Search className="w-4 h-4 text-gray-400 opacity-50" />
            <input
              type="text"
              placeholder="Buscar"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm outline-none bg-transparent text-[#030712] placeholder:text-[#6b7280] w-28"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Carregando objetos disponíveis...</p>
          ) : porComponente.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-gray-600">Nenhum objeto disponível</p>
              <p className="text-xs text-gray-400 mt-1">
                Para vincular objetos, os componentes precisam ter sua metadata importada.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40 w-[280px]">Objeto</th>
                    <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40">Permissões</th>
                  </tr>
                </thead>
                <tbody>
                  {porComponente.map(({ componente, objetos }) => (
                    <>
                      {/* Component group header */}
                      <tr key={`comp-${componente?.id ?? 'unknown'}`} className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={2} className="px-3 py-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {componente?.nome ?? 'Componente desconhecido'}
                          </p>
                        </td>
                      </tr>
                      {objetos.map(item => (
                        <tr key={item.objeto.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                          <td className="px-3 py-3">
                            <p className="text-sm font-medium text-[#030712]">{item.objeto.nome}</p>
                            {item.objeto.descricao && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px]">{item.objeto.descricao}</p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {item.objeto.permissoesDisponiveis.map(perm => {
                                const ativa = item.permissoesAtivas.includes(perm.id)
                                return (
                                  <button
                                    key={perm.id}
                                    type="button"
                                    onClick={() => togglePermissao(item.objeto.id, perm.id)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                                      ativa
                                        ? 'bg-[#030712] text-white border-[#030712]'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                                    }`}
                                  >
                                    {perm.nome}
                                  </button>
                                )
                              })}
                              {item.objeto.permissoesDisponiveis.length === 0 && (
                                <span className="text-xs text-gray-400 italic">Sem permissões definidas</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Salvando...' : 'Salvar permissões'}
          </Button>
        </div>
      </div>
    </div>
  )
}
