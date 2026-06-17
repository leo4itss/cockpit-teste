import { useState, useEffect, useRef } from 'react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { useToast, ToastContainer } from './ui/Toast'
import type { Componente } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Componente, 'id' | 'createdAt'>) => Promise<void>
  onDelete?: () => void
  /** Se true, botão de remoção mostra "Inativar" em vez de "Excluir" */
  isLinked?: boolean | null
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
export function ComponenteSheet({ open, onClose, onSave, onDelete, isLinked, initialComponente }: Props) {
  const isEditing = !!initialComponente
  const { toasts, toast, dismiss } = useToast()

  const [nome, setNome]                           = useState('')
  const [descricao, setDescricao]                 = useState('')
  const [metadataUrl, setMetadataUrl]             = useState('')
  const [metadataTestado, setMetadataTestado]     = useState(false)
  const [testedUrl, setTestedUrl]                 = useState('')
  const [selectedTipos, setSelectedTipos]         = useState<string[]>([])
  const [saving, setSaving]                       = useState(false)
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)

  // Valores iniciais para detecção de alterações não salvas
  const initialNomeRef       = useRef('')
  const initialDescricaoRef  = useRef('')
  const initialTiposRef      = useRef<string[]>([])

  useEffect(() => {
    if (open) {
      const n  = initialComponente?.nome ?? ''
      const d  = initialComponente?.descricao ?? ''
      const tl = initialComponente?.tiposLicenca ?? []
      const mu = initialComponente?.metadataUrl ?? ''

      setNome(n)
      setDescricao(d)
      setMetadataUrl(mu)
      setSelectedTipos(tl)
      setTestedUrl(mu)
      setUnsavedDialogOpen(false)

      // Em modo edição: já possui tipos configurados → exibir seção diretamente
      const jaTemDados = !!initialComponente &&
        (initialComponente.tiposLicenca.length > 0 || !!initialComponente.metadataUrl)
      setMetadataTestado(jaTemDados)

      // Guarda snapshot inicial para comparação
      initialNomeRef.current       = n
      initialDescricaoRef.current  = d
      initialTiposRef.current      = tl
    }
  }, [open, initialComponente])

  function hasUnsavedChanges() {
    if (!isEditing) return false
    return (
      nome !== initialNomeRef.current ||
      descricao !== initialDescricaoRef.current ||
      JSON.stringify(selectedTipos) !== JSON.stringify(initialTiposRef.current)
    )
  }

  function toggleTipo(id: string) {
    setSelectedTipos(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function handleMetadataUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newUrl = e.target.value
    setMetadataUrl(newUrl)

    // Se já tinha testado e URL mudou → alerta e desfaz seção
    if (metadataTestado && newUrl !== testedUrl) {
      const previousUrl     = testedUrl
      const previousTipos   = [...selectedTipos]
      setMetadataTestado(false)
      setSelectedTipos([])
      toast(
        'A URL de metadata foi alterada.\nTeste novamente para atualizar os tipos de licença.',
        'warning',
        {
          label: 'Desfazer',
          onClick: () => {
            setMetadataUrl(previousUrl)
            setTestedUrl(previousUrl)
            setMetadataTestado(true)
            setSelectedTipos(previousTipos)
          },
        },
      )
    }
  }

  function handleTestarURL() {
    const url = metadataUrl.trim()

    // Validação: URL vazia ou mal-formada
    if (!url) {
      toast('Informe uma URL válida para testar o endpoint.', 'warning')
      return
    }
    try {
      new URL(url)
    } catch {
      toast('Informe uma URL válida para testar o endpoint.', 'warning')
      return
    }

    // Simulação de sucesso: pré-seleciona todos os tipos mockados
    setTestedUrl(url)
    setMetadataTestado(true)
    setSelectedTipos(METADATA_MOCK_TIPOS.map(t => t.id))
    toast('URL validada com sucesso.\nTipos de licença identificados automaticamente.', 'success')
  }

  async function handleSave() {
    // Validação de campos obrigatórios
    const missing: string[] = []
    if (!nome.trim())      missing.push('Informe o nome do componente.')
    if (!descricao.trim()) missing.push('Informe a descrição do componente.')
    if (!metadataUrl.trim()) {
      missing.push('Informe a URL de metadata.')
    } else {
      try { new URL(metadataUrl.trim()) }
      catch { missing.push('Informe uma URL válida.') }
    }

    if (missing.length > 0) {
      toast(
        `Não foi possível criar a solução. Revise os dados e tente novamente.\n${missing.join('\n')}`,
        'warning',
      )
      return
    }

    // URL informada mas não testada
    if (!metadataTestado) {
      toast(
        'Não foi possível criar a solução. Revise os dados e tente novamente.\nInforme a URL de metadata.',
        'warning',
      )
      return
    }

    // Nenhum tipo selecionado após teste
    if (selectedTipos.length === 0) {
      toast('Selecione pelo menos um tipo de licença para salvar o componente.', 'warning')
      return
    }

    setSaving(true)
    try {
      await onSave({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        metadataUrl: metadataUrl.trim() || undefined,
        tiposLicenca: selectedTipos,
        tipoModelo: 'fga',
      })
      doClose()
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (isEditing && hasUnsavedChanges()) {
      setUnsavedDialogOpen(true)
      return
    }
    doClose()
  }

  function doClose() {
    setNome('')
    setDescricao('')
    setMetadataUrl('')
    setMetadataTestado(false)
    setTestedUrl('')
    setSelectedTipos([])
    setUnsavedDialogOpen(false)
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={handleClose}
        title={isEditing ? 'Editar componente' : 'Adicionar componente'}
        description="Configure o componente que poderá ser selecionado ao criar soluções."
        width="w-[640px]"
        footer={
          <>
            {isEditing && onDelete && (
              isLinked ? (
                <Button
                  variant="ghost"
                  onClick={onDelete}
                  className="mr-auto text-amber-600 hover:bg-amber-50"
                >
                  Inativar componente
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={onDelete}
                  className="mr-auto text-red-600 hover:bg-red-50"
                >
                  Excluir componente
                </Button>
              )
            )}
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar componente'}
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

            {/* Modelo de permissões */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#030712]">
                Modelo de permissões
              </label>
              <div className="flex flex-col gap-2">
                {([
                  { value: 'fga',    label: 'FGA (OpenFGA)',  desc: 'Modelo padrão baseado em relações OpenFGA (viewer / member / admin)', color: 'blue'   },
                  { value: 'docnix', label: 'DocNix',         desc: 'Ações granulares por objeto — MaxDoc, DocAction, DocAudit',     color: 'violet' },
                  { value: 'custom', label: 'Custom',         desc: 'Modelo customizado (configuração avançada)',                           color: 'amber'  },
                ] as const).map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                      tipoModelo === opt.value
                        ? opt.color === 'blue'   ? 'border-blue-400 bg-blue-50'
                        : opt.color === 'violet' ? 'border-violet-400 bg-violet-50'
                        :                          'border-amber-400 bg-amber-50'
                        : 'border-[#e5e7eb] hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipoModelo"
                      value={opt.value}
                      checked={tipoModelo === opt.value}
                      onChange={() => setTipoModelo(opt.value)}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className={`text-sm font-semibold ${
                        tipoModelo === opt.value
                          ? opt.color === 'blue'   ? 'text-blue-700'
                          : opt.color === 'violet' ? 'text-violet-700'
                          :                          'text-amber-700'
                          : 'text-[#030712]'
                      }`}>{opt.label}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
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
                    onChange={isEditing ? undefined : handleMetadataUrlChange}
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

      {/* Dialog de alterações não salvas (edit mode) */}
      <Dialog
        open={unsavedDialogOpen}
        onClose={() => setUnsavedDialogOpen(false)}
        title="Editar componentes"
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setUnsavedDialogOpen(false)}>Continuar editando</Button>
            <Button onClick={doClose}>Sair sem salvar</Button>
          </>
        }
      >
        <p className="text-sm text-[#030712] leading-5">
          Existem alterações não salvas. Deseja sair mesmo assim?
        </p>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
