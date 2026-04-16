import { useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { api } from '@/api/client'

type ValidationStatus = 'idle' | 'loading' | 'success' | 'error'

interface Props {
  value: string
  onChange: (url: string) => void
}

/**
 * Campo de URL de metadata com botão "Testar URL".
 *
 * Ao clicar em Testar, faz POST /api/componentes/validate-metadata
 * e exibe feedback visual: sucesso (formato correto) ou erro (URL
 * inacessível ou formato inválido).
 *
 * Formato esperado do endpoint de metadata:
 * {
 *   "componentId": string,
 *   "name": string,
 *   "version": string,
 *   "tiposLicenca": [{ "id": string, "nome": string, "unidade": string }]
 * }
 */
export function MetadataUrlInput({ value, onChange }: Props) {
  const [status, setStatus] = useState<ValidationStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleTest() {
    if (!value.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await api.validateMetadataUrl(value.trim())
      if (result.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(result.error ?? 'Resposta fora do formato esperado')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Não foi possível alcançar a URL')
    }
  }

  function handleChange(url: string) {
    onChange(url)
    if (status !== 'idle') setStatus('idle')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="URL de Metadata"
            placeholder="https://seu-componente.com/metadata"
            value={value}
            onChange={e => handleChange(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTest}
          disabled={!value.trim() || status === 'loading'}
          className="shrink-0 mb-0.5"
        >
          {status === 'loading'
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Testando...</>
            : 'Testar URL'
          }
        </Button>
      </div>

      {status === 'success' && (
        <p className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          URL válida — formato de retorno correto
        </p>
      )}
      {status === 'error' && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {errorMsg}
        </p>
      )}
      {status === 'idle' && (
        <p className="text-xs text-[#6b7280]">
          Opcional — endpoint GET que retorna os tipos de licença disponíveis neste componente.
        </p>
      )}
    </div>
  )
}
