import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { METADATA_MOCK_TIPOS } from './ComponenteSheet'
import { useIsPlatformAdmin, useIsPasArchitect, useComponenteConfig } from '@/authz/hooks'
import type { Componente } from '@/types'

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
  const isPlatformAdmin = useIsPlatformAdmin()
  const isPasArchitect  = useIsPasArchitect()
  const canViewCatalog  = isPlatformAdmin || isPasArchitect

  const { config, loading } = useComponenteConfig(
    componente?.id ?? undefined,
    componente?.nome ?? undefined,
  )

  if (!componente) return null

  const tiposVinculados = METADATA_MOCK_TIPOS.filter(t =>
    componente.tiposLicenca.includes(t.id)
  )
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

        {/* ── Catálogo FGA ──────────────────────────────── */}
        {canViewCatalog && (
          <>
            <div className="border-t border-[#e5e7eb]" />
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-base font-bold text-[#030712] leading-6">Catálogo de Permissões</p>
                <p className="text-sm text-[#6b7280] mt-1">
                  Papéis e ações FGA disponíveis para este componente.
                </p>
              </div>

              {loading ? (
                <p className="text-sm text-gray-400">Carregando catálogo…</p>
              ) : (
                <>
                  {/* Papéis */}
                  {config.papeis.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Papéis ({config.papeis.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {config.papeis.map(p => (
                          <span
                            key={p.value}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  {(config.acoes ?? []).length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Ações ({(config.acoes ?? []).length})
                      </p>
                      <div className="border border-[#e5e7eb] rounded-xl overflow-hidden divide-y divide-gray-100">
                        {(config.acoes ?? []).map(a => (
                          <div key={a.acao} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-sm text-[#030712] flex-1">{a.label}</span>
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 shrink-0">
                              {a.acao}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {config.papeis.length === 0 && (config.acoes ?? []).length === 0 && (
                    <p className="text-sm text-gray-400">
                      Nenhum catálogo configurado para este componente.
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}

      </div>
    </Sheet>
  )
}
