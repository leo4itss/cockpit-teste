import { useState } from 'react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import type { User } from '@/types'
// papel removido da UI — acesso é gerenciado por Grupos

interface Props {
  open: boolean
  onClose: () => void
  onSave: (user: Omit<User, 'id'>) => void
}

const COUNTRIES = [
  { value: 'Brasil', label: 'Brasil' },
]

const AREAS = [
  { value: 'Tecnologia', label: 'Tecnologia' },
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Arquitetura', label: 'Arquitetura' },
  { value: 'Suporte', label: 'Suporte' },
]


const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'America/São Paulo' },
  { value: 'America/Fortaleza', label: 'America/Fortaleza' },
  { value: 'America/Manaus', label: 'America/Manaus' },
]

function SectionLegend({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-3">
      <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
    </div>
  )
}

function Separator() {
  return <div className="border-t border-gray-200 w-full" />
}

function ImageUploadRow({ description }: { description: string }) {
  return (
    <div className="flex items-start gap-7">
      <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0 overflow-hidden">
        <div className="w-full h-full bg-gray-200 rounded-full" />
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <p className="text-sm text-[#6b7280] leading-5">{description}</p>
        <Button variant="outline" size="sm" type="button" className="self-start">
          Escolher imagem
        </Button>
      </div>
    </div>
  )
}

export function NewUserSheet({ open, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    nomeCompleto: '',
    usuario: '',
    email: '',
    senha: '',
    pais: 'Brasil',
    telefone: '',
    area: '',
    cargo: '',
    etiquetas: '',
    formatoData: 'DD/MM/YYYY',
    formatoHora: '24h',
    fusoHorario: 'America/Sao_Paulo',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSave() {
    onSave({
      nomeCompleto: form.nomeCompleto,
      usuario: form.usuario,
      email: form.email,
      pais: form.pais,
      telefone: form.telefone,
      area: form.area,
      cargo: form.cargo,
      etiquetas: form.etiquetas,
      formatoData: form.formatoData,
      formatoHora: form.formatoHora,
      fusoHorario: form.fusoHorario,
      status: 'Ativo',
      ultimoAcesso: new Date().toLocaleDateString('pt-BR'),
      createdAt: new Date().toLocaleDateString('pt-BR'),
    })
    resetForm()
    onClose()
  }

  function resetForm() {
    setForm({
      nomeCompleto: '',
      usuario: '',
      email: '',
      senha: '',
      pais: 'Brasil',
      telefone: '',
      area: '',
      cargo: '',
      papel: '',
      etiquetas: '',
      formatoData: 'DD/MM/YYYY',
      formatoHora: '24h',
      fusoHorario: 'America/Sao_Paulo',
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Novo Usuário"
      width="w-[768px]"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-10">

        {/* Foto de perfil */}
        <div className="flex flex-col gap-7">
          <ImageUploadRow description="Foto de perfil. Formato: 512x512 pixels." />
          <Separator />
        </div>

        {/* Informações básicas */}
        <div className="flex flex-col gap-7">
          <SectionLegend>Informações básicas</SectionLegend>

          <Input
            label="Nome completo"
            required
            placeholder="Escreva o seu nome completo"
            value={form.nomeCompleto}
            onChange={e => set('nomeCompleto', e.target.value)}
          />

          <Input
            label="Usuário/login"
            required
            placeholder="Nome de usuário"
            value={form.usuario}
            onChange={e => set('usuario', e.target.value)}
          />

          <Input
            label="E-mail"
            required
            placeholder="E-mail"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />

          <Input
            label="Senha"
            required
            placeholder="Digite a senha"
            type="password"
            value={form.senha}
            onChange={e => set('senha', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="País / Região"
              options={COUNTRIES}
              value={form.pais}
              onChange={e => set('pais', e.target.value)}
            />
            <Input
              label="Número"
              required
              placeholder="(xx) x.xxxx-xx-xx"
              value={form.telefone}
              onChange={e => set('telefone', e.target.value)}
            />
          </div>

          <Separator />
        </div>

        {/* Informações Profissionais */}
        <div className="flex flex-col gap-7">
          <SectionLegend>Informações Profissionais</SectionLegend>

          <Select
            label="Área"
            options={AREAS}
            placeholder="Selecione a área"
            value={form.area}
            onChange={e => set('area', e.target.value)}
          />

          <Select
            label="Cargo"
            options={AREAS}
            placeholder="Selecione o cargo"
            value={form.cargo}
            onChange={e => set('cargo', e.target.value)}
          />

          <Select
            label="Papel"
            options={ROLES}
            placeholder="Selecione o papel"
            value={form.papel}
            onChange={e => set('papel', e.target.value)}
          />

          <div className="border border-gray-200 rounded-md flex items-center gap-2.5 px-4 py-3 w-full">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#030712] leading-4">
                Etiquetas de classificação
              </p>
            </div>
          </div>

          <Separator />
        </div>

        {/* Configurações regionais */}
        <div className="flex flex-col gap-7">
          <SectionLegend>Configurações regionais</SectionLegend>

          <Select
            label="Formato de data"
            options={[{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }]}
            value={form.formatoData}
            onChange={e => set('formatoData', e.target.value)}
          />

          <Select
            label="Formato de hora (12/24)"
            options={[
              { value: '24h', label: '24h' },
              { value: '12h', label: '12h (AM/PM)' },
            ]}
            value={form.formatoHora}
            onChange={e => set('formatoHora', e.target.value)}
          />

          <Select
            label="Fuso horário pessoal"
            options={TIMEZONES}
            value={form.fusoHorario}
            onChange={e => set('fusoHorario', e.target.value)}
          />
        </div>

      </div>
    </Sheet>
  )
}
