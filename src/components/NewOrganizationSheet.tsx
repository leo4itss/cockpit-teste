import { useState, useRef } from 'react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Upload, Plus, Info } from 'lucide-react'
import { AddContatoDialog, type Contato } from './AddContatoDialog'
import { AddAdminDialog, type AdminUser } from './AddAdminDialog'
import type { Organization } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (org: Omit<Organization, 'id' | 'qtdContas' | 'qtdSolucoes' | 'qtdContratos' | 'contacts'>) => void
  onDelete?: () => void
}

const STATES = [
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' },
  { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'GO', label: 'Goiás' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' }, { value: 'PR', label: 'Paraná' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' },
]

const SEGMENTS = [
  { value: 'agro', label: 'Agropecuário' }, { value: 'energia', label: 'Energia' },
  { value: 'farma', label: 'Farmacêutico' }, { value: 'industrial', label: 'Serviços Industriais' },
  { value: 'tech', label: 'Tecnologia' }, { value: 'varejo', label: 'Varejo' },
  { value: 'outro', label: 'Outro' },
]

const ARQUITETOS = [
  { value: 'marcelo', label: 'Marcelo Gomes' },
  { value: 'ana', label: 'Ana Lima' },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base font-bold text-[#030712] pb-3 leading-6">{children}</p>
  )
}

function Divider() {
  return <div className="border-t border-[#e5e7eb]" />
}

export function NewOrganizationSheet({ open, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState({
    name: '', razaoSocial: '', docType: 'CNPJ', docNumber: '',
    businessSegment: '', officialSite: 'http://',
    country: 'Brasil', zipCode: '', address: '', complement: '',
    state: '', city: '', arquitetoPAS: '', domain: '',
    activitySector: '', status: 'Ativo' as const, createdAt: '',
  })
  const [outroSegmento, setOutroSegmento] = useState('')
  const [contacts, setContacts] = useState<Contato[]>([])
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  const canSave = form.name.trim() !== '' && form.razaoSocial.trim() !== '' && form.docNumber.trim() !== ''

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSave() {
    if (!canSave) return
    const businessSegment = form.businessSegment === 'outro' ? outroSegmento.trim() || 'Outro' : form.businessSegment
    onSave({ ...form, businessSegment, logo: logoPreview || undefined, createdAt: new Date().toLocaleDateString('pt-BR') })
    onClose()
  }

  function handleAddContact(contact: Contato) {
    setContacts(prev => [...prev, contact])
  }

  function handleAddAdmin(admin: AdminUser) {
    setAdmins(prev => [...prev, admin])
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Nova organização"
        description="Preencha os dados da organização"
        width="w-[640px]"
        footer={
          <>
            {onDelete ? (
              <Button variant="ghost" onClick={onDelete} className="mr-auto text-red-600 hover:bg-red-50">
                Excluir organização
              </Button>
            ) : null}
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className={!canSave ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Criar Organização
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-10">

          {/* ── Logotipo ───────────────────────────────────── */}
          <div>
            <SectionTitle>Logotipo</SectionTitle>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#f3f4f6] flex items-center justify-center shrink-0 overflow-hidden border border-[#e5e7eb]">
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-[#9ca3af] text-xs">Logo</span>
                }
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <p className="text-sm text-[#6b7280] leading-5">
                  Adicione o logotipo para facilitar a identificação da organização no sistema.
                  Tamanho recomendado: 512 × 512 px.
                </p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex items-center gap-2 border border-[#e5e7eb] rounded-md px-4 h-9 text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors self-start"
                >
                  <Upload className="w-4 h-4 text-[#6b7280]" />
                  Escolher imagem
                </button>
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Informações básicas ────────────────────────── */}
          <div>
            <SectionTitle>Informações básicas</SectionTitle>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nome da organização" required placeholder="Digite o nome da organização" value={form.name} onChange={e => set('name', e.target.value)} />
                <Input label="Razão social" required placeholder="Qual a razão social?" value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Tipo do documento" options={[{ value: 'CNPJ', label: 'CNPJ' }, { value: 'CPF', label: 'CPF' }]} value={form.docType} onChange={e => set('docType', e.target.value)} />
                <Input label="Número do documento" required placeholder="00-000-000/0000-00" value={form.docNumber} onChange={e => set('docNumber', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <Select label="Segmento de negócio" options={SEGMENTS} placeholder="Escolha o segmento" value={form.businessSegment} onChange={e => set('businessSegment', e.target.value)} />
                  {form.businessSegment === 'outro' && (
                    <Input
                      placeholder="Descreva o segmento de negócio"
                      value={outroSegmento}
                      onChange={e => setOutroSegmento(e.target.value)}
                    />
                  )}
                </div>
                <Input label="Site oficial" required placeholder="http://" value={form.officialSite} onChange={e => set('officialSite', e.target.value)} />
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Endereço ───────────────────────────────────── */}
          <div>
            <SectionTitle>Endereço</SectionTitle>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Select label="País / Região" options={[{ value: 'Brasil', label: 'Brasil' }]} value={form.country} onChange={e => set('country', e.target.value)} />
                <Input label="CEP" required placeholder="Digite o CEP" value={form.zipCode} onChange={e => set('zipCode', e.target.value)} />
              </div>
              <Input label="Endereço postal" required placeholder="Digite o endereço completo, inclusive número" value={form.address} onChange={e => set('address', e.target.value)} />
              <Input label="Complemento" required placeholder="Complemento do local" value={form.complement} onChange={e => set('complement', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Estado" options={STATES} placeholder="Selecione" value={form.state} onChange={e => set('state', e.target.value)} />
                <Input label="Cidade" required placeholder="Digite a cidade" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Contatos ───────────────────────────────────── */}
          <div>
            <SectionTitle>Contatos</SectionTitle>
            <div className="flex flex-col gap-4">
              {contacts.length === 0 && admins.length === 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-[#030712] leading-none mb-1">
                    Não há contatos adicionados
                  </p>
                  <p className="text-sm text-[#6b7280] leading-5">
                    Adicione contatos responsáveis pela organização.
                  </p>
                </div>
              )}

              {contacts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 border border-[#e5e7eb] rounded-md px-4 py-2.5 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-[#030712]">{c.nome}</span>
                        {c.cargo && <span className="text-[#6b7280] ml-2">{c.cargo}</span>}
                      </div>
                      {c.emails?.[0] && <span className="text-[#6b7280] text-xs truncate max-w-[200px]">{c.emails[0]}</span>}
                    </div>
                  ))}
                </div>
              )}

              {admins.length > 0 && (
                <div className="flex flex-col gap-2">
                  {admins.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 border border-[#e5e7eb] rounded-md px-4 py-2.5 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-[#030712]">{a.nome}</span>
                      </div>
                      <span className="text-[#6b7280] text-xs truncate max-w-[200px]">{a.email}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {/* Card: Contatos */}
                <div className="flex items-center gap-2.5 border border-[#e5e7eb] rounded-md px-4 py-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#030712] leading-4">
                      Contatos<span className="text-[#dc2626] ml-0.5">*</span>
                    </p>
                    <p className="text-sm text-[#6b7280] leading-5">
                      Adicione pessoas de referência para comunicação com a organização. Esses contatos não recebem acesso ao sistema automaticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContactDialogOpen(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#030712] hover:text-blue-600 transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>

                {/* Card: Usuário administrador */}
                <div className="flex items-center gap-2.5 border border-[#e5e7eb] rounded-md px-4 py-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#030712] leading-4">
                      Usuário administrador<span className="text-[#030712] ml-0.5">*</span>
                    </p>
                    <p className="text-sm text-[#6b7280] leading-5">
                      Defina quem terá acesso inicial para administrar a organização no sistema.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminDialogOpen(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#030712] hover:text-blue-600 transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Configuração PAS ───────────────────────────── */}
          <div>
            <SectionTitle>Configuração PAS</SectionTitle>
            <div className="flex flex-col gap-4">
              <Select
                label="Arquiteto PAS responsável"
                required
                options={ARQUITETOS}
                placeholder="Escolha o arquiteto"
                value={form.arquitetoPAS}
                onChange={e => set('arquitetoPAS', e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <Input
                  label="Subdomínio"
                  required
                  placeholder="Digite o subdomínio (usar somente letras minúsculas)"
                  value={form.domain}
                  onChange={e => set('domain', e.target.value)}
                />
                <div className="flex items-center gap-2 bg-blue-100 px-2 py-4 rounded-sm">
                  <Info className="w-4 h-4 text-[#030712] shrink-0" />
                  <p className="text-sm text-[#030712] leading-5">
                    Escolha um nome único para o domínio. Este identificador não pode ser duplicado no sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </Sheet>

      <AddContatoDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        onAdd={handleAddContact}
      />
      <AddAdminDialog
        open={adminDialogOpen}
        onClose={() => setAdminDialogOpen(false)}
        onAdd={handleAddAdmin}
      />
    </>
  )
}
