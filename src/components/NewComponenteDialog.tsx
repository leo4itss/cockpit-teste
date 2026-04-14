import { useState, useEffect } from 'react'
import { Dialog } from './ui/Dialog'
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
 * Dialog para criar ou editar um Componente.
 *
 * Um componente representa um módulo/serviço que compõe uma Solução.
 * Opcionalmente, pode expor uma URL de metadata para que o sistema
 * identifique dinamicamente os tipos de licença disponíveis.
 *
 * Campos:
 *  - Nome (obrigatório)
 *  - Descrição
 *  - URL de Metadata (com validação ao vivo)
 *  - Tipos de Licença disponíveis (seleção a partir dos tipos cadastrados)
 */
export function NewComponenteDialog({ open, onClose, onSave, tiposLicenca, initialComponente }: Props) {
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

  const canSave = nome.trim() !== ''

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={initialComponente ? 'Editar componente' : 'Novo componente'}
      className="max-w-lg"
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
      <div className="flex flex-col gap-6">
        <Input
          label="Nome do componente"
          required
          placeholder="ex: PAS Core, Knowledge Base"
          value={nome}
          onChange={e => setNome(e.target.value)}
          autoFocus
        />

        <Input
          label="Descrição"
          placeholder="Descreva brevemente o propósito deste componente"
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
        />

        <MetadataUrlInput value={metadataUrl} onChange={setMetadataUrl} />

        {/* Tipos de Licença disponíveis neste componente */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium text-[#030712]">Tipos de Licença disponíveis</p>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Selecione quais tipos de licença este componente suporta.
            </p>
          </div>

          {tiposLicenca.length === 0 ? (
            <p className="text-sm text-[#6b7280]">Nenhum tipo de licença cadastrado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tiposLicenca.map(t => {
                const checked = selectedTipos.includes(t.id)
                return (
                  <label
                    key={t.id}
                    className={`flex items-start gap-3 px-3 py-2.5 border rounded-md cursor-pointer transition-colors ${
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
                    <div className="flex flex-col gap-0">
                      <p className="text-sm font-medium text-[#030712] leading-5">{t.nome}</p>
                      <p className="text-xs text-[#6b7280]">Unidade: {t.unidade}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
