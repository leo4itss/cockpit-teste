import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { METADATA_MOCK_TIPOS } from './ComponenteSheet'
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
      <div className="h-9 px-3 flex items-center bg-[#f9fafb] border border-[#e5e7eb] rounded-md text-sm text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
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
      width="w-[560px]"
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
                <div className="h-9 px-3 flex items-center bg-[#f3f4f6] border border-[#e5e7eb] rounded-md text-sm text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] overflow-hidden">
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

      </div>
    </Sheet>
  )
}
