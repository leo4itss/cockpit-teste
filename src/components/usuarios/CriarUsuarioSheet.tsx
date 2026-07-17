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
import { cn } from '@/lib/utils'
import { NIVEIS_CONTA, getComponenteConfig } from '@/authz/mock'
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
  variant?:   'usuario' | 'org-admin'   // 'org-admin' ajusta título/descrição/label do botão
}

const VARIANT_COPY = {
  'usuario': {
    titulo:     'Criar usuário',
    descricao:  'Preencha os dados para criar um novo usuário na plataforma.',
    botaoCriar: 'Criar usuário',
    botaoSalvando: 'Criando...',
  },
  'org-admin': {
    titulo:     'Criar Org Admin',
    descricao:  'Preencha os dados para criar um novo Administrador da Organização — terá acesso para gerenciar contas, usuários e grupos desta organização.',
    botaoCriar: 'Criar Org Admin',
    botaoSalvando: 'Criando...',
  },
} as const

// ── Componente ────────────────────────────────────────────────

export function CriarUsuarioSheet({ open, onClose, onSuccess, accountId, variant = 'usuario' }: Props) {
  const copy = VARIANT_COPY[variant]
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
      const payload: Omit<User, 'avatar' | 'senha'> = {
        id:           crypto.randomUUID(),
        nomeCompleto: form.nomeCompleto.trim(),
        usuario:      form.usuario.trim(),
        email:        form.email.trim(),
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

      // Vincula à conta — membership sempre criado quando há accountId
      if (accountId) {
        await api.addAccountMembro(accountId, { userId: created.id, papel: papel || 'member' }).catch(() => null)
        if (grupoId) {
          await api.addGrupoMembro(grupoId, created.id).catch(() => null)
        }
      }

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
          <NestedSheetTitle>{copy.titulo}</NestedSheetTitle>
          <NestedSheetDescription>
            {copy.descricao}
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

              <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-blue-100 bg-blue-50">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
                </svg>
                <p className="text-xs text-blue-700 leading-relaxed">
                  A senha será definida pelo próprio usuário após a criação da conta,
                  por meio de um e-mail de primeiro acesso.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="País / Região"
                  options={COUNTRIES}
                  value={form.pais}
                  onChange={value => set('pais', value ?? '')}
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
                onChange={value => set('area', value ?? '')}
              />

              <Select
                label="Cargo"
                options={CARGOS}
                placeholder="Selecione o cargo"
                value={form.cargo}
                onChange={value => set('cargo', value ?? '')}
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
                onChange={value => set('formatoData', value ?? '')}
              />

              <Select
                label="Formato de hora (12/24)"
                options={FORMATOS_HORA}
                placeholder="Selecione o formato de hora"
                value={form.formatoHora}
                onChange={value => set('formatoHora', value ?? '')}
              />

              <Select
                label="Fuso horário pessoal"
                options={FUSOS}
                placeholder="Selecione o fuso horário"
                value={form.fusoHorario}
                onChange={value => set('fusoHorario', value ?? '')}
              />
            </div>

            {/* ── Papel + Grupo (só quando accountId fornecido) ─ */}
            {accountId && (
              <>
                <Divider />
                <div className="flex flex-col gap-7">
                  <SectionTitle>Acesso e grupo</SectionTitle>

                  {/* Nível de acesso na conta */}
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[#030712]">
                      Papel na conta
                      <span className="ml-1 text-xs text-[#6b7280] font-normal">
                        — opcional; define o vínculo com esta conta
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {NIVEIS_CONTA.map(p => (
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
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#6b7280]">
                      Promoção para Administrador de conta é feita pelo Org Admin. Perfis de acesso às instâncias são configurados separadamente.
                    </p>
                  </div>

                  {/* Grupo */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-medium text-[#030712]">
                      Grupo
                      <span className="ml-1 text-xs text-[#6b7280] font-normal">
                        — opcional
                      </span>
                    </p>
                    <Select
                      placeholder="(Nenhum grupo)"
                      options={grupos.filter(g => g.status === 'Ativo').map(g => ({ value: g.id, label: g.nome }))}
                      value={grupoId}
                      onChange={value => setGrupoId(value ?? '')}
                    />
                  </div>

                  {/* Preview das permissões resultantes */}
                  {(papel || grupoId) && (() => {
                    const nivelDef = papel ? NIVEIS_CONTA.find(p => p.value === papel) : null
                    const grupoDef = grupoId ? grupos.find(g => g.id === grupoId) : null
                    // Tenta derivar ações do papel do grupo via getComponenteConfig
                    const grupoPapelAcoes: { componenteLabel: string; papelLabel: string; acoes: string[] }[] = []
                    if (grupoDef?.papel) {
                      // Para cada componente único existente na conta (baseado nos grupos disponíveis)
                      // tentamos resolução via config do grupo.papel. Como não temos componentesAtivos aqui,
                      // tentamos resolver pelo nome do grupo como fallback.
                      const config = getComponenteConfig(grupoDef.nome)
                      const papelDef = config.papeis.find(p => p.value === grupoDef.papel)
                      if (papelDef) {
                        const acoes = papelDef.defaultAcoes ?? []
                        if (acoes.length > 0) {
                          const MAX = 6
                          const visiveis = acoes.slice(0, MAX)
                          const extra = acoes.length - MAX
                          grupoPapelAcoes.push({
                            componenteLabel: config.label,
                            papelLabel: papelDef.label,
                            acoes: extra > 0 ? [...visiveis, `+ ${extra} mais`] : visiveis,
                          })
                        }
                      }
                    }

                    return (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex flex-col gap-2">
                        <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                          Ações resultantes
                        </p>

                        {/* Nível de conta */}
                        {nivelDef && (
                          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border w-fit', nivelDef.cls)}>
                            {nivelDef.label}
                          </span>
                        )}

                        {/* Grupo + ações */}
                        {grupoDef && (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200 w-fit">
                              Grupo: {grupoDef.nome}
                            </span>
                            {grupoPapelAcoes.length > 0 ? (
                              grupoPapelAcoes.map(({ componenteLabel, papelLabel, acoes }) => (
                                <div key={componenteLabel} className="mt-1">
                                  <p className="text-xs text-blue-700 font-medium">
                                    {componenteLabel} — {papelLabel}:
                                  </p>
                                  <p className="text-xs text-blue-600 leading-relaxed">
                                    {acoes.join(', ')}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-blue-600 mt-0.5">
                                Acesso a instâncias configurado pelo papel do grupo.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Sem grupo — hint */}
                        {!grupoDef && nivelDef && (
                          <p className="text-xs text-blue-600">
                            Acesso a instâncias é definido após a criação.
                          </p>
                        )}
                      </div>
                    )
                  })()}
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
            {saving ? copy.botaoSalvando : copy.botaoCriar}
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
