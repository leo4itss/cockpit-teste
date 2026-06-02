import { useState } from 'react'
import { Check } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Button } from '@/components/ui/Button'
import { AtribuirPermissoesSheet } from '@/components/permissoes/AtribuirPermissoesSheet'
import type { User } from '@/types'

// ── Helpers ───────────────────────────────────────────────────

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
}

function Field({ label, value, required }: { label: string; value?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#030712]">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="h-9 px-3 flex items-center bg-[#f3f4f6] rounded-md text-sm text-[#6b7280] overflow-hidden">
        <span className="truncate">{value || 'Não informado'}</span>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────

interface Props {
  open:         boolean
  onClose:      () => void
  user:         User | null
  accountId:    string
  accountNome?: string
  onEdit:       (user: User) => void
}

// ── Componente ────────────────────────────────────────────────

export function UsuarioDetailAccountSheet({
  open, onClose, user, accountId, accountNome, onEdit,
}: Props) {
  const [showPermissoes, setShowPermissoes] = useState(false)

  if (!user) return null

  function handleClose() {
    setShowPermissoes(false)
    onClose()
  }

  return (
    <NestedSheet open={open} onClose={handleClose} width="w-[640px]">
      <NestedSheetHeader
        onClose={handleClose}
        action={
          <Button variant="outline" size="sm" onClick={() => onEdit(user)}>Editar</Button>
        }
      >
        <NestedSheetTitle>Detalhes do Usuário</NestedSheetTitle>
      </NestedSheetHeader>

      <NestedSheetBody>
        <div className="flex flex-col gap-8">

          {/* Identificação */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e5e7eb] shrink-0 flex items-center justify-center text-sm font-semibold text-[#6b7280] overflow-hidden">
              {user.avatar
                ? <img src={user.avatar} alt={user.nomeCompleto} className="w-full h-full object-cover" />
                : user.nomeCompleto.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-[#030712] leading-6 truncate">{user.nomeCompleto}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16a34a]">
                <span className="w-4 h-4 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                </span>
                Criado
              </span>
            </div>
          </div>

          <Divider />

          {/* Informações básicas */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Informações básicas</SectionTitle>
            <Field label="Nome completo" value={user.nomeCompleto} required />
            <Field label="Usuário/login" value={user.usuario} required />
            <Field label="E-mail" value={user.email} required />
            <div className="grid grid-cols-2 gap-4">
              <Field label="País / Região" value={user.pais} required />
              <Field label="Número" value={user.telefone} required />
            </div>
          </div>

          <Divider />

          {/* Contatos */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Contatos</SectionTitle>
            <Field label="Telefone" value={user.telefone} required />
            <Field label="E-mail" value={user.email} required />
          </div>

          <Divider />

          {/* Informações Profissionais */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Informações Profissionais</SectionTitle>
            <Field label="Área" value={user.area} required />
            <Field label="Cargo" value={user.cargo} required />
            <Field label="Perfil na empresa" value={user.papel} required />
            <Field label="Etiquetas de classificação" value={user.etiquetas} required />
          </div>

          <Divider />

          {/* Configurações regionais */}
          <div className="flex flex-col gap-4">
            <SectionTitle>Configurações regionais</SectionTitle>
            <Field label="Formato de data" value={user.formatoData} />
            <Field label="Formato de hora (12/24)" value={user.formatoHora} />
            <Field label="Fuso horário pessoal" value={user.fusoHorario} />
          </div>

        </div>

        {/* Sheet aninhada nível 2 — renderizada dentro do body para herdar o contexto de nível */}
        <AtribuirPermissoesSheet
          open={showPermissoes}
          onClose={() => setShowPermissoes(false)}
          entityType="usuario"
          entityId={user.id}
          entityNome={user.nomeCompleto}
          accountId={accountId}
          accountNome={accountNome}
        />
      </NestedSheetBody>

      <NestedSheetFooter>
        <Button variant="outline" onClick={handleClose}>Cancelar</Button>
        <Button onClick={() => setShowPermissoes(true)}>Atribuir permissões</Button>
      </NestedSheetFooter>
    </NestedSheet>
  )
}
