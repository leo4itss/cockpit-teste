import { useState, useEffect } from 'react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { MetadataUrlInput } from './MetadataUrlInput'
import type { TipoLicenca, Componente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Componente, 'id' | 'createdAt'>) => Promise<void>
  tiposLicenca: TipoLicenca[]
  initialComponente?: Componente
}

/**
 * Sheet lateral para criar ou editar um Componente.
 *
 * Um componente representa um módulo/serviço que compõe uma Solução.
 * Campos:
 *  - Nome (obrigatório)
 *  - Descrição
 *  - URL de Metadata — endpoint GET que retorna os tipos de licença disponíveis.
 *    Formato esperado: { componentId, name, version, tiposLicenca: [{ id, nome, unidade }] }
 *  - Tipos de Licença disponíveis (seleção manual como fallback quando não há metadataUrl)
 */
export function ComponenteSheet({ open, onClose, onSave, tiposLicenca, initialComponente }: Props) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [metadataUrl, setMetadataUrl] = useState('')
  const [selectedTipos, setSelectedTipos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setNome(initialComponente?.nome ?? '')
      setDescricao(initialComponente?.descricao ?? '')
      setMetadataUrl(initialComponente?.metadataUrl ?? '')
      setSelectedTipos(initialComponente?.tiposLicenca ?? [])
    }
  }, [open, initialComponente])

  function toggleTipo(id: string) {
    setSelectedTipos(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    if (!nome.trim()) return
    setSaving(true)
    try {
      await onSave({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        metadataUrl: metadataUrl.trim() || undefined,
        tiposLicenca: selectedTipos,
      })
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setNome('')
    setDescricao('')
    setMetadataUrl('')
    setSelectedTipos([])
    onClose()
  }

  const canSave = nome.trim() !== '' && descricao.trim() !== ''

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={initialComponente ? 'Editar componente' : 'Adicionar componente'}
      description="Configure o componente que poderá ser selecionado ao criar soluções."
      width="w-[560px]"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-8">

        {/* Dados básicos */}
        <div className="flex flex-col gap-5">
          <Input
            label="Nome do componente"
            required
            placeholder="ex: PAS Core, Knowledge Base, Doc Neia"
            value={nome}
            onChange={e => setNome(e.target.value)}
            autoFocus
          />

          <Input
            label="Descrição"
            required
            placeholder="Descreva brevemente o propósito deste componente"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
          />
        </div>

        <div className="border-t border-[#e5e7eb]" />

        {/* URL de Metadata */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-base font-bold text-[#030712] leading-6">Metadata</p>
            <p className="text-sm text-[#6b7280] mt-1">
              Informe o endpoint GET que expõe os tipos de licença disponíveis neste componente.
              O sistema consultará esta URL para derivar automaticamente as opções de licença.
            </p>
          </div>
          <MetadataUrlInput value={metadataUrl} onChange={setMetadataUrl} />
        </div>

        <div className="border-t border-[#e5e7eb]" />

        {/* Tipos de Licença disponíveis */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-base font-bold text-[#030712] leading-6">Tipos de Licença</p>
            <p className="text-sm text-[#6b7280] mt-1">
              Selecione manualmente quais tipos de licença este componente suporta.
              Usado como fallback quando a URL de metadata não está configurada.
            </p>
          </div>

          {tiposLicenca.length === 0 ? (
            <p className="text-sm text-[#6b7280] bg-gray-50 rounded-md px-4 py-3">
              Nenhum tipo de licença cadastrado no sistema.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tiposLicenca.map(t => {
                const checked = selectedTipos.includes(t.id)
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 px-4 py-3 border rounded-md cursor-pointer transition-colors ${
                      checked
                        ? 'border-[#2563eb] bg-blue-50'
                        : 'border-[#e5e7eb] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTipo(t.id)}
                      className="mt-0.5 w-4 h-4 rounded border-[#e5e7eb] text-blue-600 shadow-sm cursor-pointer shrink-0"
                    />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-medium text-[#030712] leading-5">{t.nome}</p>
                      <p className="text-xs text-[#6b7280]">
                        {t.descricao ? `${t.descricao} · ` : ''}Unidade: {t.unidade}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </Sheet>
  )
}
