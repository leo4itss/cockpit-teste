import { useState, useEffect } from 'react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import type { Componente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Componente, 'id' | 'createdAt'>) => Promise<void>
  onDelete?: () => void
  initialComponente?: Componente
}

// Tipos mockados retornados pela URL de Metadata (simulação de protótipo).
// IDs coincidem com os TipoLicenca do mock global para consistência.
export const METADATA_MOCK_TIPOS = [
  { id: 'tl-1', nome: 'Usuário nominal',                unidade: 'usuários' },
  { id: 'tl-2', nome: 'Usuário concorrente',            unidade: 'sessões'  },
  { id: 'tl-3', nome: 'Tamanho de banco de dados',      unidade: 'GB'       },
  { id: 'tl-4', nome: 'Quantidade de assistentes',      unidade: 'unidades' },
  { id: 'tl-5', nome: 'Número de workspaces',           unidade: 'unidades' },
  { id: 'tl-6', nome: 'Quantidade de tokens/mensagens', unidade: 'tokens'   },
]

/**
 * Sheet lateral para criar ou editar um Componente.
 *
 * Fluxo de criação:
 *  1. Preenche Nome e Descrição (obrigatórios)
 *  2. Opcionalmente informa URL de Metadata
 *  3. Clica "Testar URL" → simula busca e exibe tipos de licença mockados (todos pré-selecionados)
 *  4. Seleciona/desseleciona tipos e salva
 *
 * Fluxo de edição:
 *  - URL já configurada (leitura); tipos exibidos com checkboxes para ajuste fino
 *  - "Testar URL" desabilitado (metadados já foram consultados)
 */
export function ComponenteSheet({ open, onClose, onSave, onDelete, initialComponente }: Props) {
  const isEditing = !!initialComponente

  const [nome, setNome]                           = useState('')
  const [descricao, setDescricao]                 = useState('')
  const [metadataUrl, setMetadataUrl]             = useState('')
  const [metadataTestado, setMetadataTestado]     = useState(false)
  const [selectedTipos, setSelectedTipos]         = useState<string[]>([])
  const [saving, setSaving]                       = useState(false)

  useEffect(() => {
    if (open) {
      setNome(initialComponente?.nome ?? '')
      setDescricao(initialComponente?.descricao ?? '')
      setMetadataUrl(initialComponente?.metadataUrl ?? '')
      setSelectedTipos(initialComponente?.tiposLicenca ?? [])
      // Em modo edição: já possui tipos configurados → exibir seção diretamente
      const jaTemDados = !!initialComponente &&
        (initialComponente.tiposLicenca.length > 0 || !!initialComponente.metadataUrl)
      setMetadataTestado(jaTemDados)
    }
  }, [open, initialComponente])

  function toggleTipo(id: string) {
    setSelectedTipos(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function handleTestarURL() {
    setMetadataTestado(true)
    // Simula retorno da URL: pré-seleciona todos os tipos mockados
    setSelectedTipos(METADATA_MOCK_TIPOS.map(t => t.id))
  }

  async function handleSave() {
    if (!nome.trim() || !descricao.trim()) return
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
    setMetadataTestado(false)
    setSelectedTipos([])
    onClose()
  }

  const canSave = nome.trim() !== '' && descricao.trim() !== ''

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title={isEditing ? 'Editar componente' : 'Adicionar componente'}
      description="Configure o componente que poderá ser selecionado ao criar soluções."
      width="w-[560px]"
      footer={
        <>
          {isEditing && onDelete && (
            <Button
              variant="ghost"
              onClick={onDelete}
              className="mr-auto text-red-600 hover:bg-red-50"
            >
              Excluir componente
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>cancelar</Button>
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

        {/* ── Dados básicos ────────────────────────────── */}
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
            {/* URL + botão */}
            <div className="flex items-end gap-3">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-sm font-medium text-[#030712] flex items-center gap-0.5">
                  URL de Metadata
                  {!isEditing && <span className="text-[#dc2626] ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  value={metadataUrl}
                  onChange={e => { if (!isEditing) setMetadataUrl(e.target.value) }}
                  readOnly={isEditing}
                  placeholder="https://seuservico.com/metadata"
                  className={[
                    'h-9 px-3 border border-[#e5e7eb] rounded-md text-sm',
                    'outline-none transition-colors shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]',
                    isEditing
                      ? 'bg-[#f3f4f6] text-[#6b7280] cursor-default'
                      : 'bg-white text-[#030712] placeholder:text-[#9ca3af] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
                  ].join(' ')}
                />
              </div>
              <button
                type="button"
                onClick={!isEditing ? handleTestarURL : undefined}
                disabled={isEditing}
                className={[
                  'h-9 px-4 rounded-md text-sm font-medium shrink-0 transition-colors',
                  isEditing
                    ? 'bg-[#f3f4f6] text-[#111827] opacity-50 cursor-not-allowed'
                    : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] cursor-pointer',
                ].join(' ')}
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
        {metadataTestado && (
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
                {METADATA_MOCK_TIPOS.map(t => {
                  const checked = selectedTipos.includes(t.id)
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-3 border border-[#e5e7eb] rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTipo(t.id)}
                        className="w-4 h-4 rounded border-[#e5e7eb] text-blue-600 shadow-sm cursor-pointer shrink-0 accent-[#2563eb]"
                      />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-sm font-medium text-[#030712] leading-4">{t.nome}</p>
                        <p className="text-sm text-[#6b7280]">Unidade: {t.unidade}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </>
        )}

      </div>
    </Sheet>
  )
}
