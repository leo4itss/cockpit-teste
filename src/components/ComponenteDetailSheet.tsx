import { useState, useEffect } from 'react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { METADATA_MOCK_TIPOS } from './ComponenteSheet'
import { api } from '@/api/client'
import { useIsPlatformAdmin, useIsPasArchitect } from '@/authz/hooks'
import type { Componente, Atribuicao } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  componente: Componente | null
  onEdit: () => void
}

function ReadonlyField({ label, value, required }: { label: string; value?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#030712] flex items-center gap-0.5">
        {label}
        {required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="h-9 px-3 flex items-center bg-[#f3f4f6] rounded-md text-sm text-[#6b7280]">
        {value || '—'}
      </div>
    </div>
  )
}

/**
 * Sheet de visualização de um Componente (modo leitura).
 * Clicar em "Editar" no header abre o ComponenteSheet em modo edição.
 */
export function ComponenteDetailSheet({ open, onClose, componente, onEdit }: Props) {
  const isPlatformAdmin  = useIsPlatformAdmin()
  const isPasArchitect   = useIsPasArchitect()
  const canManageAtribuicoes = isPlatformAdmin || isPasArchitect

  const [atribuicoes, setAtribuicoes]           = useState<Atribuicao[]>([])
  const [atribuicoesLoaded, setAtribuicoesLoaded] = useState(false)
  const [novaAtribNome, setNovaAtribNome]       = useState('')
  const [novaAtribModulo, setNovaAtribModulo]   = useState('')

  useEffect(() => {
    if (componente?.id && canManageAtribuicoes && !atribuicoesLoaded) {
      api.getAtribuicoes(componente.id).then(data => {
        setAtribuicoes(data)
        setAtribuicoesLoaded(true)
      }).catch(() => setAtribuicoesLoaded(true))
    }
  }, [componente?.id, canManageAtribuicoes, atribuicoesLoaded])

  // Reset ao mudar de componente
  useEffect(() => {
    setAtribuicoes([])
    setAtribuicoesLoaded(false)
    setNovaAtribNome('')
    setNovaAtribModulo('')
  }, [componente?.id])

  if (!componente) return null

  // Resolve os tipos do componente contra os tipos mockados
  const tiposVinculados = METADATA_MOCK_TIPOS.filter(t =>
    componente.tiposLicenca.includes(t.id)
  )
  // Fallback: se IDs não batem com o mock, mostra os IDs como texto
  const tiposParaExibir = tiposVinculados.length > 0
    ? tiposVinculados
    : componente.tiposLicenca.map(id => ({ id, nome: id, unidade: '—' }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhe do componente"
      width="w-[640px]"
      headerAction={
        <Button variant="outline" size="sm" onClick={onEdit}>
          Editar
        </Button>
      }
    >
      <div className="flex flex-col gap-8">

        {/* ── Dados básicos ────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <ReadonlyField label="Nome do componente" value={componente.nome} required />
          <ReadonlyField label="Descrição" value={componente.descricao} required />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#030712]">Modelo de permissões</label>
            <div className="flex items-center gap-2">
              {componente.tipoModelo === 'docnix' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  DocNix
                </span>
              )}
              {componente.tipoModelo === 'custom' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Custom
                </span>
              )}
              {(!componente.tipoModelo || componente.tipoModelo === 'fga') && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  FGA (OpenFGA)
                </span>
              )}
              <span className="text-xs text-[#6b7280]">
                {componente.tipoModelo === 'docnix'
                  ? 'Ações granulares por objeto (MaxDoc / DocAction)'
                  : componente.tipoModelo === 'custom'
                  ? 'Modelo customizado'
                  : 'Modelo padrão baseado em relações OpenFGA'}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-[#e5e7eb]" />

        {/* ── Metadata ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-base font-bold text-[#030712] leading-6">Metadata</p>
            <p className="text-sm text-[#6b7280] mt-1">
              Informe o endpoint GET que expõe os tipos de licença disponíveis neste componente.
              O sistema consultará esta URL para derivar automaticamente as opções de licença.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-3">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium text-[#030712] flex items-center gap-0.5">
                  URL de Metadata
                  <span className="text-[#dc2626] ml-0.5">*</span>
                </label>
                <div className="h-9 px-3 flex items-center bg-[#f3f4f6] rounded-md text-sm text-[#6b7280] overflow-hidden">
                  <span className="truncate">{componente.metadataUrl || '—'}</span>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="h-9 px-4 rounded-md text-sm font-medium bg-[#f3f4f6] text-[#111827] opacity-50 cursor-not-allowed shrink-0"
              >
                Testar URL
              </button>
            </div>
            <p className="text-xs text-[#6b7280]">
              Informe um endpoint GET válido para consultar os tipos de licença disponíveis neste componente.
            </p>
          </div>
        </div>

        {/* ── Tipos de licença identificados ────────────── */}
        {tiposParaExibir.length > 0 && (
          <>
            <div className="border-t border-[#e5e7eb]" />
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-base font-bold text-[#030712] leading-6">
                  Tipos de licença identificados
                </p>
                <p className="text-sm text-[#6b7280] mt-1">
                  A URL de metadata identificou os tipos de licença disponíveis.
                  Selecione abaixo quais deles devem ser salvos para este componente.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {tiposParaExibir.map(t => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-0.5 px-4 py-3 border border-[#e5e7eb] rounded-md"
                  >
                    <p className="text-sm font-medium text-[#030712] leading-4">{t.nome}</p>
                    <p className="text-sm text-[#6b7280]">Unidade: {t.unidade}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Ações do Componente ─────────────────── */}
        {canManageAtribuicoes && (
          <>
            <div className="border-t border-[#e5e7eb]" />
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-base font-bold text-[#030712] leading-6">Ações do Componente</p>
                <p className="text-sm text-[#6b7280] mt-1">
                  Defina as ações disponíveis para membros deste objeto.
                  Ações ativas aparecem como opções ao adicionar membros.
                </p>
              </div>

              {/* Lista de ações ativas */}
              <div className="flex flex-col gap-2">
                {atribuicoes.filter(a => a.status === 'Ativo').length === 0 && atribuicoesLoaded && (
                  <p className="text-xs text-gray-400">Nenhuma ação ativa.</p>
                )}
                {atribuicoes.filter(a => a.status === 'Ativo').map(a => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 border border-[#e5e7eb] rounded-md">
                    <span className="text-sm flex-1 text-[#030712]">{a.nome}</span>
                    {a.modulo && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{a.modulo}</span>
                    )}
                    <button
                      onClick={async () => {
                        await api.updateAtribuicao(componente.id, a.id, { status: 'Inativo' })
                        setAtribuicoes(prev => prev.map(x => x.id === a.id ? { ...x, status: 'Inativo' as const } : x))
                      }}
                      className="text-xs text-amber-600 hover:text-amber-800 ml-2"
                    >
                      Inativar
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Remover "${a.nome}" permanentemente?`)) return
                        await api.deleteAtribuicao(componente.id, a.id)
                        setAtribuicoes(prev => prev.filter(x => x.id !== a.id))
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              {/* Lista de atribuições inativas */}
              {atribuicoes.filter(a => a.status === 'Inativo').length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Inativas</p>
                  {atribuicoes.filter(a => a.status === 'Inativo').map(a => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#e5e7eb] rounded-md bg-gray-50/60 opacity-70">
                      <span className="text-sm flex-1 text-gray-400 line-through">{a.nome}</span>
                      {a.modulo && (
                        <span className="text-xs text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">{a.modulo}</span>
                      )}
                      <button
                        onClick={async () => {
                          await api.updateAtribuicao(componente.id, a.id, { status: 'Ativo' })
                          setAtribuicoes(prev => prev.map(x => x.id === a.id ? { ...x, status: 'Ativo' as const } : x))
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-800"
                      >
                        Ativar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Remover "${a.nome}" permanentemente?`)) return
                          await api.deleteAtribuicao(componente.id, a.id)
                          setAtribuicoes(prev => prev.filter(x => x.id !== a.id))
                        }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Adicionar nova atribuição */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da atribuição"
                  value={novaAtribNome}
                  onChange={e => setNovaAtribNome(e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Módulo (opcional)"
                  value={novaAtribModulo}
                  onChange={e => setNovaAtribModulo(e.target.value)}
                  className="w-32 text-sm border border-gray-300 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={async () => {
                    if (!novaAtribNome.trim()) return
                    const nova = await api.createAtribuicao(componente.id, {
                      nome: novaAtribNome,
                      modulo: novaAtribModulo || undefined,
                    })
                    setAtribuicoes(prev => [...prev, nova])
                    setNovaAtribNome('')
                    setNovaAtribModulo('')
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 shrink-0"
                >
                  + Adicionar
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </Sheet>
  )
}
