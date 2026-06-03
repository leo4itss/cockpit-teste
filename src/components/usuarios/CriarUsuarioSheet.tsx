import { useState, useEffect } from 'react'
import { Upload, Plus } from 'lucide-react'
import {
  NestedSheet,
  NestedSheetHeader,
  NestedSheetTitle,
  NestedSheetDescription,
  NestedSheetBody,
  NestedSheetFooter,
} from '@/components/ui/nested-sheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { EtiquetaDialog } from '@/components/EtiquetaDialog'
import { api } from '@/api/client'
import { mockPapeisDisponiveis } from '@/authz/mock'
import { cn } from '@/lib/utils'
import type { User, Grupo } from '@/types'

// ── Opções dos selects (espelho do EditUserSheet) ─────────────

const COUNTRIES = [{ value: 'Brasil', label: 'Brasil' }]

const AREAS = [
  { value: 'Tecnologia da Informação (TI)', label: 'Tecnologia da Informação (TI)' },
  { value: 'Recursos Humanos (RH)',          label: 'Recursos Humanos (RH)' },
  { value: 'Finanças',                       label: 'Finanças' },
  { value: 'Marketing',                      label: 'Marketing' },
  { value: 'Vendas',                         label: 'Vendas' },
  { value: 'Operação',                       label: 'Operação' },
]

const CARGOS = [
  { value: 'Estagiário',              label: 'Estagiário' },
  { value: 'Junior',                  label: 'Junior' },
  { value: 'Pleno',                   label: 'Pleno' },
  { value: 'Senior',                  label: 'Senior' },
  { value: 'Lider',                   label: 'Lider' },
  { value: 'Gerente',                 label: 'Gerente' },
  { value: 'Diretor',                 label: 'Diretor' },
  { value: 'Vice-Presidente (VP)',    label: 'Vice-Presidente (VP)' },
  { value: 'C-Level (CEO, CTO, etc.)', label: 'C-Level (CEO, CTO, etc.)' },
]

const FORMATOS_DATA = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA' },
  { value: 'YYYY/MM/DD', label: 'AAAA/MM/DD' },
]

const FORMATOS_HORA = [
  { value: '24h', label: 'Formato 24 horas (ex: 14:05)' },
  { value: '12h', label: 'Formato 12 horas (ex: 02:05 PM)' },
]

const FUSOS = [
  { value: 'America/Sao_Paulo',  label: 'Brasil (Brasília)' },
  { value: 'America/New_York',   label: 'EUA (Nova Iorque)' },
  { value: 'Europe/Lisbon',      label: 'Portugal (Lisboa)' },
]

// ── Helpers ───────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6 pb-3">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

const EMPTY_FORM = {
  nomeCompleto: '',
  usuario:      '',
  email:        '',
  pais:         'Brasil',
  telefone:     '',
  area:         '',
  cargo:        '',
  papel:        '',
  etiquetas:    '',
  formatoData:  'DD/MM/YYYY',
  formatoHora:  '24h',
  fusoHorario:  'America/Sao_Paulo',
}

interface Props {
  open:       boolean
  onClose:    () => void
  onSuccess?: (user: User) => void
  accountId?: string   // quando fornecido, habilita seleção de papel e grupo
}

// ── Componente ────────────────────────────────────────────────

export function CriarUsuarioSheet({ open, onClose, onSuccess, accountId }: Props) {
  const [form, setForm]                   = useState({ ...EMPTY_FORM })
  const [etiquetaDialogOpen, setEtiquetaDialogOpen] = useState(false)
  const [saving, setSaving]               = useState(false)
  const [errors, setErrors]               = useState<Record<string, string>>({})
  const [saveError, setSaveError]         = useState<string | null>(null)
  // Papel + Grupo
  const [papel, setPapel]                 = useState('')
  const [grupoId, setGrupoId]             = useState('')
  const [grupos, setGrupos]               = useState<Grupo[]>([])

  // Carrega grupos da conta ao abrir
  useEffect(() => {
    if (!open || !accountId) return
    api.getGrupos({ accountId }).then(setGrupos).catch(() => setGrupos([]))
  }, [open, accountId])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.nomeCompleto.trim()) e.nomeCompleto = 'Nome obrigatório'
    if (!form.usuario.trim())      e.usuario      = 'Usuário obrigatório'
    if (!form.email.trim())        e.email        = 'E-mail obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCriar() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload: Omit<User, 'avatar'> = {
        id:           crypto.randomUUID(),
        nomeCompleto: form.nomeCompleto.trim(),
        usuario:      form.usuario.trim(),
        email:        form.email.trim(),
        senha:        form.senha,
        pais:         form.pais,
        telefone:     form.telefone.trim(),
        area:         form.area,
        cargo:        form.cargo,
        papel:        form.papel,
        etiquetas:    form.etiquetas,
        formatoData:  form.formatoData,
        formatoHora:  form.formatoHora,
        fusoHorario:  form.fusoHorario,
        status:       'Ativo',
        ultimoAcesso: '',
        createdAt:    new Date().toISOString(),
      }
      const created = await api.createUser(payload)
      onSuccess?.(created)
      handleClose()
    } catch (err: any) {
      setSaveError(err?.message ?? 'Erro ao criar usuário. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setSaveError(null)
    setPapel('')
    setGrupoId('')
    setGrupos([])
    onClose()
  }

  const initials = form.nomeCompleto.trim()
    ? form.nomeCompleto.trim().split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <>
      <NestedSheet open={open} onClose={handleClose} width="w-[640px]">
        <NestedSheetHeader onClose={handleClose}>
          <NestedSheetTitle>Criar usuário</NestedSheetTitle>
          <NestedSheetDescription>
            Preencha os dados para criar um novo usuário na plataforma.
          </NestedSheetDescription>
        </NestedSheetHeader>

        <NestedSheetBody>
          <div className="flex flex-col gap-10">

            {/* ── Foto de perfil ───────────────────────── */}
            <div className="flex flex-col gap-7">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f3f4f6] border border-[#e5e7eb] shrink-0 flex items-center justify-center text-xs font-semibold text-[#6b7280]">
                  {initials}
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

            {/* ── Informações básicas ──────────────────── */}
            <div className="flex flex-col gap-7">
              <SectionTitle>Informações básicas</SectionTitle>

              <div>
                <Input
                  label="Nome completo"
                  required
                  placeholder="Escreva o nome completo"
                  value={form.nomeCompleto}
                  onChange={e => set('nomeCompleto', e.target.value)}
                />
                {errors.nomeCompleto && <p className="mt-1 text-xs text-red-600">{errors.nomeCompleto}</p>}
              </div>

              <div>
                <Input
                  label="Usuário/login"
                  required
                  placeholder="Nome de usuário"
                  value={form.usuario}
                  onChange={e => set('usuario', e.target.value)}
                />
                {errors.usuario && <p className="mt-1 text-xs text-red-600">{errors.usuario}</p>}
              </div>

              <div>
                <Input
                  label="E-mail"
                  required
                  placeholder="email@empresa.com"
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <Input
                  label="Senha"
                  required
                  placeholder="Crie uma senha"
                  type="password"
                  value={form.senha}
                  onChange={e => set('senha', e.target.value)}
                />
                {errors.senha && <p className="mt-1 text-xs text-red-600">{errors.senha}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="País / Região"
                  options={COUNTRIES}
                  value={form.pais}
                  onChange={e => set('pais', e.target.value)}
                />
                <Input
                  label="Telefone"
                  placeholder="(xx) x.xxxx-xxxx"
                  value={form.telefone}
                  onChange={e => set('telefone', e.target.value)}
                />
              </div>

              <Divider />
            </div>

            {/* ── Informações Profissionais ────────────── */}
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

            {/* ── Configurações regionais ──────────────── */}
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

            {/* ── Papel + Grupo (só quando accountId fornecido) ─ */}
            {accountId && (
              <>
                <Divider />
                <div className="flex flex-col gap-7">
                  <SectionTitle>Acesso e grupo</SectionTitle>

                  {/* Papel */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[#030712]">
                      Papel
                      <span className="ml-1 text-xs text-[#6b7280] font-normal">
                        — define o nível de acesso FGA padrão
                      </span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {mockPapeisDisponiveis.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPapel(prev => prev === p.value ? '' : p.value)}
                          className={cn(
                            'flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-colors',
                            papel === p.value
                              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          )}
                        >
                          <span className="text-sm font-medium text-[#030712]">{p.label}</span>
                          <span className="text-xs text-[#6b7280] mt-0.5 leading-tight">{p.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grupo */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium text-[#030712]">
                      Grupo
                      <span className="ml-1 text-xs text-[#6b7280] font-normal">
                        — opcional
                      </span>
                    </p>
                    <select
                      value={grupoId}
                      onChange={e => setGrupoId(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors text-[#030712]"
                    >
                      <option value="">(Nenhum grupo)</option>
                      {grupos.filter(g => g.status === 'Ativo').map(g => (
                        <option key={g.id} value={g.id}>{g.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Preview das permissões resultantes */}
                  {(papel || grupoId) && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                        Permissões resultantes
                      </p>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {papel && (() => {
                          const p = mockPapeisDisponiveis.find(p => p.value === papel)
                          return p ? (
                            <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', p.cls)}>
                              Papel: {p.label}
                            </span>
                          ) : null
                        })()}
                        {grupoId && (() => {
                          const g = grupos.find(g => g.id === grupoId)
                          return g ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                              Grupo: {g.nome}
                            </span>
                          ) : null
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </NestedSheetBody>

        <NestedSheetFooter>
          {saveError && (
            <p className="text-xs text-red-600 flex-1 mr-2">{saveError}</p>
          )}
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCriar} disabled={saving}>
            {saving ? 'Criando...' : 'Criar usuário'}
          </Button>
        </NestedSheetFooter>
      </NestedSheet>

      <EtiquetaDialog
        open={etiquetaDialogOpen}
        onClose={() => setEtiquetaDialogOpen(false)}
        value={form.etiquetas}
        onSave={v => set('etiquetas', v)}
      />
    </>
  )
}
