import { useState, useEffect } from 'react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
} from '@/components/ui/nested-sheet'
import { api } from '@/api/client'

// ── Tipos ──────────────────────────────────────────────────────

interface EfetivaFonte {
  atribuicaoId: string
  fonte: string
  entidadeId: string
  displayName?: string
}

interface InstanciaOpcao {
  id: string
  nome: string
  componenteId: string
}

interface PermissoesEfetivasSheetProps {
  open: boolean
  onClose: () => void
  userId: string
  userName: string
  /** ID da instância — se fornecido sem `instancias`, usa diretamente */
  instanciaId?: string
  instanciaNome?: string
  /** componenteId da instância selecionada */
  componenteId?: string
  /** Lista de instâncias para seleção inline (quando não há instanciaId fixo) */
  instancias?: InstanciaOpcao[]
  componenteNomes?: Record<string, string>
}

// ── Badges de origem ──────────────────────────────────────────

function FonteBadge({ fonte, entidadeId, displayName }: { fonte: string; entidadeId: string; displayName?: string }) {
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
        Via Grupo · {displayName ?? entidadeId}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      {fonte}
    </span>
  )
}

// ── Componente principal ──────────────────────────────────────

export function PermissoesEfetivasSheet({
  open,
  onClose,
  userId,
  userName,
  instanciaId: instanciaIdProp,
  instanciaNome: instanciaNomeProp,
  componenteId: componenteIdProp,
  instancias,
  componenteNomes,
}: PermissoesEfetivasSheetProps) {
  // Seleção de instância (quando não há instanciaId fixo)
  const [selectedInstanciaId, setSelectedInstanciaId] = useState<string>(instanciaIdProp ?? instancias?.[0]?.id ?? '')

  const instanciaId   = instanciaIdProp ?? selectedInstanciaId
  const instanciaAtual = instancias?.find(i => i.id === instanciaId)
  const componenteId  = componenteIdProp ?? instanciaAtual?.componenteId ?? ''
  const instanciaNome = instanciaNomeProp ?? instanciaAtual?.nome ?? instanciaId

  const [loading, setLoading] = useState(false)
  const [atribuicaoIds, setAtribuicaoIds] = useState<string[]>([])
  const [fontes, setFontes] = useState<EfetivaFonte[]>([])
  const [atribuicoesMap, setAtribuicoesMap] = useState<Record<string, string>>({})
  const [isUnrestricted, setIsUnrestricted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset selected instância when props change
  useEffect(() => {
    if (instanciaIdProp) {
      setSelectedInstanciaId(instanciaIdProp)
    } else if (instancias && instancias.length > 0) {
      setSelectedInstanciaId(instancias[0].id)
    }
  }, [instanciaIdProp, instancias])

  useEffect(() => {
    if (!open || !userId || !instanciaId || !componenteId) return
    setLoading(true)
    setIsUnrestricted(false)
    setAtribuicaoIds([])
    setFontes([])
    setError(null)

    Promise.all([
      api.getPermissoesEfetivas(instanciaId, userId),
      api.getAtribuicoes(componenteId),
    ])
      .then(([efetivas, atribs]) => {
        if (efetivas.atribuicoes.includes('*')) {
          setIsUnrestricted(true)
        } else {
          setAtribuicaoIds(efetivas.atribuicoes)
          setFontes(efetivas.fontes)
        }
        const map: Record<string, string> = {}
        atribs.forEach((a: any) => { map[a.id] = a.nome })
        setAtribuicoesMap(map)
      })
      .catch(() => setError('Não foi possível carregar as permissões efetivas.'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, instanciaId, componenteId])

  return (
    <NestedSheet open={open} onClose={onClose} width="w-[520px]">
      <NestedSheetHeader>
        <NestedSheetTitle>Ações Efetivas</NestedSheetTitle>
        <NestedSheetDescription>
          {userName} · {instanciaNome}
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody>
        {/* Seletor de objeto — exibido quando há múltiplos e nenhum fixado */}
        {!instanciaIdProp && instancias && instancias.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Objeto</label>
            <select
              value={selectedInstanciaId}
              onChange={e => setSelectedInstanciaId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {instancias.map(i => (
                <option key={i.id} value={i.id}>
                  {componenteNomes?.[i.componenteId] ? `${componenteNomes[i.componenteId]} — ` : ''}{i.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {!instanciaIdProp && instancias && instancias.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">Esta conta não possui objetos configurados.</p>
          </div>
        )}

        {loading && (
          <p className="text-sm text-gray-500 py-4">Carregando permissões...</p>
        )}

        {!loading && error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && isUnrestricted && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
            Acesso irrestrito — este usuário é administrador e tem todas as permissões nesta instância.
          </div>
        )}

        {!loading && !error && !isUnrestricted && atribuicaoIds.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-gray-800">Nenhuma ação efetiva</p>
            <p className="text-xs text-gray-500 mt-1">
              Este usuário não possui ações ativas neste objeto.
            </p>
          </div>
        )}

        {!loading && !error && !isUnrestricted && atribuicaoIds.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-70">Ação</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-70">Origem</th>
                </tr>
              </thead>
              <tbody>
                {atribuicaoIds.map(atribId => {
                  const nomeAtrib = atribuicoesMap[atribId] ?? atribId
                  const fontesDoAtrib = fontes.filter(f => f.atribuicaoId === atribId)

                  if (fontesDoAtrib.length === 0) {
                    return (
                      <tr key={atribId} className="border-b border-gray-200 last:border-0">
                        <td className="px-4 py-3 text-gray-900 font-medium">{nomeAtrib}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-400">—</span>
                        </td>
                      </tr>
                    )
                  }

                  return fontesDoAtrib.map((f, idx) => (
                    <tr key={`${atribId}-${idx}`} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        {nomeAtrib}
                      </td>
                      <td className="px-4 py-3">
                        <FonteBadge fonte={f.fonte} entidadeId={f.entidadeId} />
                      </td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          </div>
        )}
      </NestedSheetBody>
    </NestedSheet>
  )
}
