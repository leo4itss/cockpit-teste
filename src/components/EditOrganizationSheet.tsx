import { useState, useRef, useEffect } from 'react'
import { Copy, Mail, MessageCircleMore, MoreVertical, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { NewContactDialog, type ContactData } from './NewContactDialog'
import type { Contact, Organization } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  org: Organization
  onSave: (org: Organization) => void
  onDelete?: () => void
}

/* ── helpers ─────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-base font-bold text-[#030712] pb-3 leading-6">{children}</p>
}

function Divider() {
  return <div className="border-t border-[#e5e7eb] w-full" />
}

/* ── options ─────────────────────────────────────────────── */

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
]

const DOC_TYPES = [
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'CPF', label: 'CPF' },
]

const PAISES = [{ value: 'Brasil', label: 'Brasil' }]

const ARQUITETOS = [
  { value: 'marcelo', label: 'Marcelo Gomes' },
  { value: 'ana', label: 'Ana Lima' },
]

/* ── main ─────────────────────────────────────────────────── */

function buildForm(org: Organization) {
  return {
    name:            org.name,
    razaoSocial:     org.razaoSocial,
    docType:         org.docType,
    docNumber:       org.docNumber,
    businessSegment: org.businessSegment,
    officialSite:    org.officialSite,
    country:         org.country,
    zipCode:         org.zipCode,
    address:         org.address,
    complement:      org.complement,
    state:           org.state,
    city:            org.city,
    arquitetoPAS:    org.arquitetoPAS,
  }
}

export function EditOrganizationSheet({ open, onClose, org, onSave, onDelete }: Props) {
  const [form, setForm] = useState(() => buildForm(org))
  const [contacts, setContacts] = useState<Contact[]>(org.contacts ?? [])
  const [logoPreview, setLogoPreview] = useState<string>(org.logo ?? '')
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<{ idx: number; data: ContactData } | null>(null)
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Re-sync when org changes
  const [lastOrg, setLastOrg] = useState(org)
  if (org !== lastOrg) {
    setLastOrg(org)
    setForm(buildForm(org))
    setContacts(org.contacts ?? [])
    setLogoPreview(org.logo ?? '')
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuIdx(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleContactAdd(data: ContactData) {
    const contact: Contact = { name: data.name, role: data.role, phone: data.phone, email: data.email }
    if (editingContact !== null) {
      setContacts(prev => prev.map((c, i) => i === editingContact.idx ? contact : c))
    } else {
      setContacts(prev => [...prev, contact])
    }
    setEditingContact(null)
  }

  function handleEditContact(idx: number) {
    const c = contacts[idx]
    setEditingContact({ idx, data: { name: c.name, role: c.role, country: 'Brasil (+55)', phone: c.phone, contactMethod: '', email: c.email, notes: '' } })
    setOpenMenuIdx(null)
    setContactDialogOpen(true)
  }

  function handleDeleteContact(idx: number) {
    setContacts(prev => prev.filter((_, i) => i !== idx))
    setOpenMenuIdx(null)
  }

  function handleSave() {
    onSave({
      ...org,
      ...form,
      logo: logoPreview || undefined,
      contacts,
    })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Editar Organização"
        width="w-[768px]"
        footer={
          <>
            {onDelete && (
              <Button variant="destructive" onClick={onDelete} className="mr-auto">
                Excluir organização
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-10">

          {/* ── Logo ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-7">
              <div className="w-12 h-12 rounded-full bg-[#f3f4f6] flex items-center justify-center shrink-0 overflow-hidden border border-[#e5e7eb]">
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-sm font-semibold text-[#6b7280]">{org.name.charAt(0)}</span>
                }
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <p className="text-sm text-[#6b7280] leading-5">
                  Insira o logo da organização. Isso ajudará a identificar a organização de forma mais fácil e visual no sistema.
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
                  className="inline-flex items-center gap-2 h-9 px-4 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] bg-white hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors w-fit"
                >
                  <Upload className="w-4 h-4 text-[#6b7280]" />
                  Escolher imagem
                </button>
              </div>
            </div>
            <Divider />
          </div>

          {/* ── Informações básicas ───────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Informações básicas</SectionTitle>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nome da organização"
                required
                placeholder="Nome da organização"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
              <Input
                label="Razão Social"
                required
                placeholder="Razão Social"
                value={form.razaoSocial}
                onChange={e => set('razaoSocial', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Tipo do documento"
                options={DOC_TYPES}
                value={form.docType}
                onChange={e => set('docType', e.target.value)}
              />
              <Input
                label="Número do documento"
                required
                placeholder="00.000.000/0000-00"
                value={form.docNumber}
                onChange={e => set('docNumber', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Segmento de negócio"
                placeholder="Selecione"
                options={SEGMENTS}
                value={form.businessSegment}
                onChange={e => set('businessSegment', e.target.value)}
              />
              <Input
                label="Site oficial"
                required
                placeholder="https://"
                value={form.officialSite}
                onChange={e => set('officialSite', e.target.value)}
              />
            </div>

            <Divider />
          </div>

          {/* ── Endereço ─────────────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Endereço</SectionTitle>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="País / Região"
                options={PAISES}
                value={form.country}
                onChange={e => set('country', e.target.value)}
              />
              <Input
                label="CEP"
                required
                placeholder="00000-000"
                value={form.zipCode}
                onChange={e => set('zipCode', e.target.value)}
              />
            </div>

            <Input
              label="Endereço postal"
              placeholder="Rua, Avenida..."
              value={form.address}
              onChange={e => set('address', e.target.value)}
            />

            <Input
              label="Complemento"
              placeholder="Número, apartamento..."
              value={form.complement}
              onChange={e => set('complement', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Estado"
                placeholder="Selecione"
                options={STATES}
                value={form.state}
                onChange={e => set('state', e.target.value)}
              />
              <Input
                label="Cidade"
                required
                placeholder="Cidade"
                value={form.city}
                onChange={e => set('city', e.target.value)}
              />
            </div>

            <Divider />
          </div>

          {/* ── Contatos ─────────────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <div className="border border-[#e5e7eb] rounded-md bg-white px-5 pt-2 pb-4 flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between py-4">
                <p className="text-sm font-medium text-[#030712]">
                  Contato<span className="text-[#dc2626] ml-0.5">*</span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingContact(null); setContactDialogOpen(true) }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </Button>
              </div>

              <Divider />

              {contacts.length === 0 ? (
                <p className="text-sm text-[#6b7280] py-4">Nenhum contato cadastrado.</p>
              ) : (
                contacts.map((contact, i) => (
                  <div key={i}>
                    {/* Nome + cargo + menu */}
                    <div className="flex items-start gap-4 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#030712] leading-4">{contact.name}</p>
                        <p className="text-sm text-[#6b7280] leading-5 mt-1">{contact.role}</p>
                      </div>
                      <div className="relative shrink-0" ref={openMenuIdx === i ? menuRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuIdx(openMenuIdx === i ? null : i)}
                          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 text-[#6b7280] transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuIdx === i && (
                          <div className="absolute right-0 top-10 z-50 bg-white border border-[#e5e7eb] rounded-md shadow-md py-1 min-w-[128px]">
                            <button
                              type="button"
                              onClick={() => handleEditContact(i)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#030712] hover:bg-gray-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#6b7280]" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(i)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Telefone + email */}
                    <div className="flex flex-col gap-2 pb-2">
                      {contact.phone && (
                        <div className="border border-[#e5e7eb] rounded-md flex items-center gap-4 px-4 h-10">
                          <MessageCircleMore className="w-5 h-5 text-[#030712] shrink-0" />
                          <span className="flex-1 text-sm font-medium text-[#030712]">{contact.phone}</span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(contact.phone)}
                            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 text-[#030712] transition-colors shrink-0"
                            title="Copiar"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {contact.email && (
                        <div className="border border-[#e5e7eb] rounded-md flex items-center gap-4 px-4 h-10">
                          <Mail className="w-5 h-5 text-[#030712] shrink-0" />
                          <span className="flex-1 text-sm font-medium text-[#030712]">{contact.email}</span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(contact.email)}
                            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 text-[#030712] transition-colors shrink-0"
                            title="Copiar"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <Divider />
          </div>

          {/* ── Configuração PAS ─────────────────────────────── */}
          <div className="flex flex-col gap-7">
            <SectionTitle>Configuração PAS</SectionTitle>

            <Select
              label="Arquiteto PAS responsável"
              required
              placeholder="Selecione"
              options={ARQUITETOS}
              value={form.arquitetoPAS}
              onChange={e => set('arquitetoPAS', e.target.value)}
            />
          </div>

        </div>
      </Sheet>

      <NewContactDialog
        open={contactDialogOpen}
        onClose={() => { setContactDialogOpen(false); setEditingContact(null) }}
        onAdd={handleContactAdd}
        initialData={editingContact?.data}
      />
    </>
  )
}
