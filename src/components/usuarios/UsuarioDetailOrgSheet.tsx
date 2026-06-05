/**
 * UsuarioDetailOrgSheet — Sheet de detalhe de usuário para o Org Admin.
 *
 * Exibe:
 *   - Dados do usuário (nome, e-mail, cargo, área, status, último acesso)
 *   - Contas vinculadas com papel (member | account_admin)
 *   - Botão "Vincular a conta" → Dialog com select de contas disponíveis
 */

import { useState, useMemo } from 'react'
import { Building2, BadgeCheck, Clock, Mail, Briefcase, ShieldCheck, ShieldMinus, Loader2 } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import type { User, Account } from '@/types'

// ── Tipos ─────────────────────────────────────────────────────

export interface ContaVinculada {
  account: Account
  papel:   'member' | 'account_admin'
}

interface Props {
  open:             boolean
  onClose:          () => void
  user:             User | null
  contasVinculadas: ContaVinculada[]
  todasContas:      Account[]
  onVincularSuccess:(userId: string, conta: ContaVinculada) => void
  onPapelChange?:   (userId: string, accountId: string, novoPapel: 'member' | 'account_admin') => void
}

// ── Avatar colorido ───────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  { bg: 'bg-green-100',  text: 'text-green-700'  },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-pink-100',   text: 'text-pink-700'   },
  { bg: 'bg-teal-100',   text: 'text-teal-700'   },
]
function getAvatarColor(nome: string) {
  const hash = nome.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
function Avatar({ nome, size = 'lg' }: { nome: string; size?: 'md' | 'lg' }) {
  const { bg, text } = getAvatarColor(nome)
  const ini = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return (
    <div className={cn(
      'rounded-full shrink-0 flex items-center justify-center font-semibold select-none',
      bg, text,
      size === 'lg' ? 'w-14 h-14 text-xl' : 'w-8 h-8 text-xs',
    )}>
      {ini}
    </div>
  )
}

// ── Papel badge ───────────────────────────────────────────────

function PerfilBadge({ papel }: { papel: string }) {
  return papel === 'account_admin'
    ? <Badge variant="warning">Administrador da Conta</Badge>
    : <Badge variant="default">Membro</Badge>
}

// ── Dialog de vínculo ─────────────────────────────────────────

interface VincularDialogProps {
  open:         boolean
  onClose:      () => void
  user:         User
  disponiveis:  Account[]
  onVincular:   (accountId: string) => Promise<void>
}

function VincularContaDialog({ open, onClose, user, disponiveis, onVincular }: VincularDialogProps) {
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleConfirm() {
    if (!selectedId) return
    setSaving(true)
    setError(null)
    try {
      await onVincular(selectedId)
      setSelectedId('')
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao vincular conta.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setSelectedId(''); setError(null)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Vincular a conta"
      description={`Selecione a conta para vincular ${user.nomeCompleto} como Member.`}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedId || saving}>
            {saving ? 'Vinculando...' : 'Vincular'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {disponiveis.length === 0 ? (
          <p className="text-sm text-[#6b7280]">
            Este usuário já está vinculado a todas as contas disponíveis.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#030712]">
              Conta <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                disabled={saving}
                className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-50"
              >
                <option value="">Selecione uma conta...</option>
                {disponiveis.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Dialog>
  )
}

// ── Componente principal ──────────────────────────────────────

export function UsuarioDetailOrgSheet({
  open, onClose, user, contasVinculadas, todasContas, onVincularSuccess, onPapelChange,
}: Props) {
  const [showVincularDialog, setShowVincularDialog] = useState(false)
  const [changingPapelId, setChangingPapelId]       = useState<string | null>(null)  // accountId em progresso

  // Contas ainda não vinculadas ao usuário
  const vinculadasIds = new Set(contasVinculadas.map(c => c.account.id))
  const disponiveis   = useMemo(
    () => todasContas.filter(a => !vinculadasIds.has(a.id)),
    [todasContas, contasVinculadas] // eslint-disable-line react-hooks/exhaustive-deps
  )

  async function handleVincular(accountId: string) {
    if (!user) return
    await api.addAccountMembro(accountId, { userId: user.id, papel: 'member' })
    const account = todasContas.find(a => a.id === accountId)!
    onVincularSuccess(user.id, { account, papel: 'member' })
  }

  async function handleTogglePapel(accountId: string, papelAtual: 'member' | 'account_admin') {
    if (!user) return
    const novoPapel: 'member' | 'account_admin' = papelAtual === 'account_admin' ? 'member' : 'account_admin'
    const label = novoPapel === 'account_admin' ? 'alterar o perfil para Administrador de Conta' : 'alterar o perfil para Membro'
    if (!confirm(`Deseja ${label} deste usuário na conta selecionada?`)) return
    setChangingPapelId(accountId)
    try {
      await api.addAccountMembro(accountId, { userId: user.id, papel: novoPapel })
      onPapelChange?.(user.id, accountId, novoPapel)
    } finally {
      setChangingPapelId(null)
    }
  }

  if (!user) return null

  return (
    <>
      <NestedSheet open={open} onClose={onClose} width="w-[560px]">
        <NestedSheetHeader onClose={onClose}>
          {/* Avatar + nome + e-mail */}
          <div className="flex items-center gap-4 mb-1">
            <Avatar nome={user.nomeCompleto} size="lg" />
            <div className="min-w-0">
              <NestedSheetTitle>{user.nomeCompleto}</NestedSheetTitle>
              <p className="text-sm text-[#6b7280] mt-0.5 truncate">{user.email}</p>
            </div>
          </div>
        </NestedSheetHeader>

        <NestedSheetBody>
          <div className="flex flex-col gap-6">

            {/* Informações gerais */}
            <section>
              <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-3">
                Informações
              </p>
              <div className="grid grid-cols-2 gap-3">
                {user.cargo && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-[#030712]">{user.cargo}</span>
                  </div>
                )}
                {user.area && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-[#030712]">{user.area}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-[#030712] truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-[#030712]">{user.ultimoAcesso || '—'}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <BadgeCheck className="w-4 h-4 text-gray-400 shrink-0" />
                  {user.status === 'Ativo'
                    ? <Badge variant="success" showIcon>Ativo</Badge>
                    : <Badge variant="secondary" showIcon>{user.status}</Badge>}
                </div>
              </div>
            </section>

            <div className="border-t border-gray-100" />

            {/* Contas vinculadas */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
                  Contas vinculadas
                  <span className="ml-1.5 font-normal normal-case">({contasVinculadas.length})</span>
                </p>
                <button
                  onClick={() => setShowVincularDialog(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  + Vincular a conta
                </button>
              </div>

              {contasVinculadas.length === 0 ? (
                <p className="text-sm text-[#6b7280]">
                  Nenhuma conta vinculada. Clique em "Vincular a conta" para associar.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {contasVinculadas.map(({ account, papel }) => {
                    const isChanging = changingPapelId === account.id
                    return (
                      <div
                        key={account.id}
                        className="group flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm font-medium text-[#030712] truncate">{account.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <PerfilBadge papel={papel} />
                          {/* Ação de promoção/rebaixamento — visível no hover */}
                          <button
                            onClick={() => handleTogglePapel(account.id, papel)}
                            disabled={isChanging}
                            title={papel === 'account_admin' ? 'Alterar perfil para Membro' : 'Alterar perfil para Administrador de Conta'}
                            className="invisible group-hover:visible inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                            style={papel === 'account_admin'
                              ? { color: '#b45309', background: '#fef3c7' }
                              : { color: '#1d4ed8', background: '#eff6ff' }}
                          >
                            {isChanging
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : papel === 'account_admin'
                                ? <><ShieldMinus className="w-3 h-3" /> Rebaixar</>
                                : <><ShieldCheck className="w-3 h-3" /> Promover</>
                            }
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

          </div>
        </NestedSheetBody>

        <NestedSheetFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </NestedSheetFooter>
      </NestedSheet>

      {/* Dialog de vínculo — renderizado fora da sheet */}
      {user && (
        <VincularContaDialog
          open={showVincularDialog}
          onClose={() => setShowVincularDialog(false)}
          user={user}
          disponiveis={disponiveis}
          onVincular={handleVincular}
        />
      )}
    </>
  )
}
