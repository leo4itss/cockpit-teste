import { useState } from 'react'
import { Upload, Plus } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { EtiquetaDialog } from './EtiquetaDialog'
import type { User } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (user: Omit<User, 'id'>) => void
}

// ── Opções dos selects conforme Figma ────────────────────────────────

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
    papel: '',
    etiquetas: '',
    formatoData: '',
    formatoHora: '',
    fusoHorario: '',
  })
  const [etiquetaDialogOpen, setEtiquetaDialogOpen] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const canSave =
    form.nomeCompleto.trim() !== '' &&
    form.usuario.trim() !== '' &&
    form.email.trim() !== '' &&
    form.senha.trim() !== '' &&
    form.telefone.trim() !== ''

  function handleSave() {
    if (!canSave) return
    onSave({
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
      formatoData: '',
      formatoHora: '',
      fusoHorario: '',
    })
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={handleClose}
        title="Novo Usuário"
        width="w-[640px]"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Criar Usuário
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-10">

          {/* ── Foto de perfil ───────────────────────────── */}
          <div className="flex flex-col gap-7">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] shrink-0 flex items-center justify-center">
                <span className="text-xs text-[#9ca3af]">?</span>
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

            <Input
              label="E-mail"
              required
              placeholder="E-mail"
              type="email"
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
