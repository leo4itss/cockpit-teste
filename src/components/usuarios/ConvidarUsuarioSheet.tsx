/**
 * ConvidarUsuarioSheet — Account Admin convida usuário para a conta.
 *
 * Fluxo:
 *   1. Digita e-mail → sai do campo (onBlur) → lookup na API
 *   2. Encontrado   → card verde com avatar + nome
 *   3. Não encontrado → campo de nome completo aparece (novo cadastro)
 *   4. Papel fixo: Member (promoção a Account Admin é responsabilidade do Org Admin)
 *   5. Confirmar:
 *      - Encontrado:     addAccountMembro(accountId, { userId, papel: 'member' })
 *      - Não encontrado: createUser(...) → addAccountMembro(...)
 */

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2, UserPlus } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Button } from '@/components/ui/Button'
import { api } from '@/api/client'
import type { User } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  /** Conta em que o usuário será vinculado como Member */
  accountId: string
  /** Chamado com o User criado/encontrado após confirmação */
  onSuccess: (user: User) => void
}

type LookupState = 'idle' | 'loading' | 'found' | 'not-found'

// ── Helpers ───────────────────────────────────────────────────

function Avatar({ nome }: { nome: string }) {
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className="w-10 h-10 rounded-full bg-blue-100 shrink-0 flex items-center justify-center text-sm font-semibold text-blue-700 select-none">
      {ini}
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-[#030712]">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50 disabled:text-gray-400"
    />
  )
}

// ── Componente principal ──────────────────────────────────────

export function ConvidarUsuarioSheet({ open, onClose, accountId, onSuccess }: Props) {
  const [email, setEmail]               = useState('')
  const [lookupState, setLookupState]   = useState<LookupState>('idle')
  const [foundUser, setFoundUser]       = useState<User | null>(null)
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  // ── Lookup onBlur ─────────────────────────────────────────

  async function handleEmailBlur() {
    const trimmed = email.trim()
    if (!trimmed.includes('@')) return
    if (lookupState === 'loading' || lookupState === 'found') return

    setLookupState('loading')
    setFoundUser(null)
    setError(null)

    try {
      const user = await api.lookupUserByEmail(trimmed)
      if (user) { setFoundUser(user); setLookupState('found') }
      else        setLookupState('not-found')
    } catch {
      setLookupState('idle')
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    if (lookupState !== 'idle') {
      setLookupState('idle')
      setFoundUser(null)
      setNomeCompleto('')
    }
  }

  // ── Validação ─────────────────────────────────────────────

  const canSubmit =
    email.trim().includes('@') &&
    (lookupState === 'found' ||
      (lookupState === 'not-found' && nomeCompleto.trim().length > 0))

  // ── Submit ────────────────────────────────────────────────

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    try {
      let userId: string
      let userToReturn: User

      if (lookupState === 'found' && foundUser) {
        userId = foundUser.id
        userToReturn = foundUser
      } else {
        const now = new Date().toLocaleDateString('pt-BR')
        const novo: User = await api.createUser({
          id: crypto.randomUUID(),
          nomeCompleto,
          usuario: email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase(),
          email,
          pais: 'Brasil', telefone: '', area: '', cargo: '',
          papel: 'Member', etiquetas: '',
          formatoData: 'DD.MM.AAAA',
          formatoHora: 'Formato 24 horas (exemplo 12:05:10)',
          fusoHorario: 'Brasil (Brasília)',
          status: 'Ativo', ultimoAcesso: now, createdAt: now,
        })
        userId = novo.id
        userToReturn = novo
      }

      await api.addAccountMembro(accountId, { userId, papel: 'member' })
      onSuccess(userToReturn)
      handleClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao convidar usuário.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setEmail(''); setLookupState('idle'); setFoundUser(null)
    setNomeCompleto(''); setError(null)
    onClose()
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[520px]">
      <NestedSheetHeader onClose={handleClose}>
        <NestedSheetTitle>Convidar usuário</NestedSheetTitle>
        <NestedSheetDescription>
          Digite o e-mail. Se o usuário já existir na organização será vinculado à conta;
          caso contrário, um novo cadastro será criado automaticamente.
        </NestedSheetDescription>
      </NestedSheetHeader>

      <NestedSheetBody>
        <div className="flex flex-col gap-6">

          {/* Campo de e-mail */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>E-mail</FieldLabel>
            <div className="relative">
              <TextInput
                type="email"
                value={email}
                onChange={e => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="usuario@empresa.com.br"
                disabled={saving}
              />
              {lookupState === 'loading' && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin pointer-events-none" />
              )}
            </div>
            <p className="text-xs text-[#6b7280]">A verificação de duplicidade ocorre ao sair do campo.</p>
          </div>

          {/* Encontrado: card verde */}
          {lookupState === 'found' && foundUser && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar nome={foundUser.nomeCompleto} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#030712] truncate">{foundUser.nomeCompleto}</p>
                    <p className="text-xs text-[#6b7280] truncate">{foundUser.email}</p>
                  </div>
                </div>
                <p className="text-xs text-green-700">
                  Usuário encontrado na organização. Será vinculado a esta conta como <strong>Member</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Não encontrado: banner + campo de nome */}
          {lookupState === 'not-found' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">Usuário não encontrado</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Preencha o nome para criar um novo cadastro e vinculá-lo à conta.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel required>Nome completo</FieldLabel>
                <TextInput
                  type="text"
                  value={nomeCompleto}
                  onChange={e => setNomeCompleto(e.target.value)}
                  placeholder="Nome do novo usuário"
                  disabled={saving}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Papel fixo — aparece após lookup */}
          {(lookupState === 'found' || lookupState === 'not-found') && (
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Papel na conta</FieldLabel>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md">
                <UserPlus className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-[#030712]">Member</span>
                <span className="text-xs text-[#6b7280] ml-auto italic">
                  Promoção a Account Admin é feita pelo Org Admin
                </span>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </NestedSheetBody>

      <NestedSheetFooter>
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Convidando...</> : 'Convidar'}
        </Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
