import { useState, useEffect } from 'react'
import { Sheet } from './ui/Sheet'
import { Button } from './ui/Button'
import { Check } from 'lucide-react'
import { api } from '@/api/client'
import type { User, Grupo } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  user: User | null
  onEdit: (user: User) => void
}

function Separator() {
  return <div className="border-t border-gray-200 w-full" />
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-7">
      {children}
    </div>
  )
}

function SectionLegend({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-3">
      <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[#030712]">{label}</label>
      <div className="bg-gray-50 rounded-md px-3 py-2 text-sm text-[#6b7280]">
        {value || 'Não informado'}
      </div>
    </div>
  )
}

export function UserDetailSheet({ open, onClose, user, onEdit }: Props) {
  const [grupos, setGrupos] = useState<Grupo[]>([])

  useEffect(() => {
    if (open && user) {
      api.getGruposUser(user.id).then(setGrupos).catch(() => setGrupos([]))
    }
  }, [open, user])

  if (!user) return null

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Detalhes do Usuário"
      width="w-[768px]"
    >
      <div className="flex flex-col gap-10">

        {/* Header com avatar e status */}
        <FieldGroup>
          <div className="flex items-start gap-7">
            <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0 overflow-hidden">
              {user.avatar
                ? <img src={user.avatar} alt={user.nomeCompleto} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gray-200 rounded-full" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="pb-3">
                <p className="text-base font-bold text-[#030712] leading-6">{user.nomeCompleto}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
                <span className="text-xs font-medium text-[#16a34a]">Criado</span>
              </div>
            </div>
            <div className="shrink-0">
              <Button variant="outline" size="sm" onClick={() => onEdit(user)}>Editar</Button>
            </div>
          </div>
          <Separator />
        </FieldGroup>

        {/* Informações básicas */}
        <FieldGroup>
          <SectionLegend>Informações básicas</SectionLegend>
          <Field label="Nome completo" value={user.nomeCompleto} />
          <Field label="Usuário/Login" value={user.usuario} />
          <Separator />
        </FieldGroup>

        {/* Contatos */}
        <FieldGroup>
          <SectionLegend>Contatos</SectionLegend>
          <Field label="Telefone" value={user.telefone} />
          <Field label="E-mail" value={user.email} />
          <Separator />
        </FieldGroup>

        {/* Informações Profissionais */}
        <FieldGroup>
          <SectionLegend>Informações Profissionais</SectionLegend>
          <Field label="Área" value={user.area} />
          <Field label="Cargo" value={user.cargo} />
          <Field label="Papel" value={user.papel} />
          <Field label="Etiquetas de classificação" value={user.etiquetas} />
          <Separator />
        </FieldGroup>

        {/* Configurações regionais */}
        <FieldGroup>
          <SectionLegend>Configurações regionais</SectionLegend>
          <Field label="Formato de data" value={user.formatoData} />
          <Field label="Formato de hora (12/24)" value={user.formatoHora} />
          <Field label="Fuso horário pessoal" value={user.fusoHorario} />
        </FieldGroup>

      </div>
    </Sheet>
  )
}
