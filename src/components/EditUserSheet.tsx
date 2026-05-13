import { useState, useEffect } from 'react'
import { Upload, Plus } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { EtiquetaDialog } from './EtiquetaDialog'
import type { User } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  user: User | null
  onSave: (user: User) => void
  onDelete?: () => void
}

// ── Opções dos selects (mesmas do NewUserSheet) ───────────────────────

const COUNTRIES = [
  { value: 'Brasil', label: 'Brasil' },
]

const AREAS = [
  { value: 'Tecnologia da Informação (TI)', label: 'Tecnologia da Informação (TI)' },
  { value: 'Recursos Humanos (RH)', label: 'Recursos Humanos (RH)' },
  { value: 'Finanças', label: 'Finanças' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Vendas', label: 'Vendas' },
  { value: 'Operação', label: 'Operação' },
]

const CARGOS = [
  { value: 'Estagiário', label: 'Estagiário' },
  { value: 'Junior', label: 'Junior' },
  { value: 'Pleno', label: 'Pleno' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Lider', label: 'Lider' },
  { value: 'Gerente', label: 'Gerente' },
  { value: 'Diretor', label: 'Diretor' },
  { value: 'Vice-Presidente (VP)', label: 'Vice-Presidente (VP)' },
  { value: 'C-Level (CEO, CTO, etc.)', label: 'C-Level (CEO, CTO, etc.)' },
]

const PAPEIS = [
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Usuário', label: 'Usuário' },
]

const FORMATOS_DATA = [
  { value: 'DD.MM.AAAA', label: 'DD.MM.AAAA' },
  { value: 'MM.DD.AAAA', label: 'MM.DD.AAAA' },
  { value: 'MM.AAAA.DD', label: 'MM.AAAA.DD' },
]

const FORMATOS_HORA = [
  { value: 'Formato 24 horas (exemplo 12:05:10)', label: 'Formato 24 horas (exemplo 12:05:10)' },
  { value: 'Formato 14 horas (exemplo 12:05:10 PM)', label: 'Formato 14 horas (exemplo 12:05:10 PM)' },
]

const FUSOS = [
  { value: 'Brasil (Brasília)', label: 'Brasil (Brasília)' },
  { value: 'EUA (Nova Iorque)', label: 'EUA (Nova Iorque)' },
  { value: 'Portugal (Lisboa)', label: 'Portugal (Lisboa)' },
]

// ── Helpers ──────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

// ── Componente principal ──────────────────────────────────────────────

export function EditUserSheet({ open, onClose, user, onSave, onDelete }: Props) {
  const [form, setForm] = useState({
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
    formatoData: '',
    formatoHora: '',
    fusoHorario: '',
  })
  const [etiquetaDialogOpen, setEtiquetaDialogOpen] = useState(false)
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)

  useEffect(() => {
    if (user && open) {
      setForm({
        nomeCompleto: user.nomeCompleto,
        usuario: user.usuario,
        email: user.email,
        senha: user.senha ?? '',
        pais: user.pais,
        telefone: user.telefone,
        area: user.area,
        cargo: user.cargo,
        papel: user.papel,
        etiquetas: user.etiquetas,
        formatoData: user.formatoData,
        formatoHora: user.formatoHora,
        fusoHorario: user.fusoHorario,
      })
    }
  }, [user, open])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function hasUnsavedChanges() {
    if (!user) return false
    return (
      form.nomeCompleto !== user.nomeCompleto ||
      form.usuario !== user.usuario ||
      form.senha !== (user.senha ?? '') ||
      form.pais !== user.pais ||
      form.telefone !== user.telefone ||
      form.area !== user.area ||
      form.cargo !== user.cargo ||
      form.papel !== user.papel ||
      form.etiquetas !== user.etiquetas ||
      form.formatoData !== user.formatoData ||
      form.formatoHora !== user.formatoHora ||
      form.fusoHorario !== user.fusoHorario
    )
  }

  function handleClose() {
    if (hasUnsavedChanges()) {
      setUnsavedDialogOpen(true)
    } else {
      onClose()
    }
  }

  function handleSave() {
    if (!user) return
    onSave({
      ...user,
      nomeCompleto: form.nomeCompleto,
      usuario: form.usuario,
      email: form.email,
      senha: form.senha,
      pais: form.pais,
      telefone: form.telefone,
      area: form.area,
      cargo: form.cargo,
      papel: form.papel,
      etiquetas: form.etiquetas,
      formatoData: form.formatoData,
      formatoHora: form.formatoHora,
      fusoHorario: form.fusoHorario,
    })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={handleClose}
        title="Editar Usuário"
        width="w-[640px]"
        footer={
          <>
            {onDelete && (
              <Button
                variant="ghost"
                onClick={onDelete}
                className="mr-auto text-[#dc2626] hover:bg-red-50"
              >
                Excluir usuário
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-10">

          {/* ── Foto de perfil ───────────────────────────── */}
          <div className="flex flex-col gap-7">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] shrink-0 flex items-center justify-center text-xs font-semibold text-[#6b7280]">
                {user?.nomeCompleto.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? '?'}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#6b7280]">Foto de perfil. Formato: 512×512 pixels.</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 h-8 px-3 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors w-fit"
                >
                  <Upload className="w-3.5 h-3.5 text-[#6b7280]" />
                  Escolher imagem
                </button>
              </div>
            </div>
            <Divider />
          </div>

          {/* ── Informações básicas ──────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Informações básicas</SectionTitle>

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

            {/* E-mail: readonly no modo edição */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#030712]">
                E-mail<span className="text-[#dc2626] ml-0.5">*</span>
              </label>
              <div className="h-9 px-3 flex items-center bg-[#f9fafb] border border-[#e5e7eb] rounded-md text-sm text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] truncate">
                {form.email || '—'}
              </div>
            </div>

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

            <Divider />
          </div>

          {/* ── Informações Profissionais ────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Informações Profissionais</SectionTitle>

            <Select
              label="Área"
              options={AREAS}
              placeholder="Selecione a área"
              value={form.area}
              onChange={e => set('area', e.target.value)}
            />

            <Select
              label="Cargo"
              options={CARGOS}
              placeholder="Selecione o cargo"
              value={form.cargo}
              onChange={e => set('cargo', e.target.value)}
            />

            <Select
              label="Papel"
              options={PAPEIS}
              placeholder="Selecione o papel"
              value={form.papel}
              onChange={e => set('papel', e.target.value)}
            />

            {/* Etiquetas de classificação */}
            <div className="border border-[#e5e7eb] rounded-md flex items-center justify-between px-4 py-3 w-full">
              <p className="text-sm font-medium text-[#030712] leading-4">
                Etiquetas de classificação
                {form.etiquetas && (
                  <span className="ml-2 text-[#6b7280] font-normal">{form.etiquetas}</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setEtiquetaDialogOpen(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#030712] hover:text-blue-600 transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>

            <Divider />
          </div>

          {/* ── Configurações regionais ──────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Configurações regionais</SectionTitle>

            <Select
              label="Formato de data"
              options={FORMATOS_DATA}
              placeholder="Selecione o formato da data"
              value={form.formatoData}
              onChange={e => set('formatoData', e.target.value)}
            />

            <Select
              label="Formato de hora (12/24)"
              options={FORMATOS_HORA}
              placeholder="Selecione o formato de hora"
              value={form.formatoHora}
              onChange={e => set('formatoHora', e.target.value)}
            />

            <Select
              label="Fuso horário pessoal"
              options={FUSOS}
              placeholder="Selecione o fuso horário"
              value={form.fusoHorario}
              onChange={e => set('fusoHorario', e.target.value)}
            />
          </div>

        </div>
      </Sheet>

      <EtiquetaDialog
        open={etiquetaDialogOpen}
        onClose={() => setEtiquetaDialogOpen(false)}
        value={form.etiquetas}
        onSave={v => set('etiquetas', v)}
      />
    </>
  )
}
