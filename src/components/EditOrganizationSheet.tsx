import { useState, useRef, useEffect } from 'react'
import { useUsers } from '@/context/UsersContext'
import { Copy, Mail, MessageCircle, MoreVertical, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Dialog } from './ui/Dialog'
import { NewContactDialog, type ContactData } from './NewContactDialog'
import type { Contact, Organization } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  org: Organization
  onSave: (org: Organization) => void
  onDelete?: () => void      // exclusão permanente (quando canDelete=true)
  onInativar?: () => void    // inativação reversível (quando canDelete=false)
  onActivate?: () => void
  canDelete?: boolean        // true = sem soluções/contratos → mostrar Excluir
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
  { value: 'Acre', label: 'Acre' }, { value: 'Alagoas', label: 'Alagoas' },
  { value: 'Bahia', label: 'Bahia' }, { value: 'Ceará', label: 'Ceará' },
  { value: 'Distrito Federal', label: 'Distrito Federal' }, { value: 'Goiás', label: 'Goiás' },
  { value: 'Minas Gerais', label: 'Minas Gerais' }, { value: 'Pará', label: 'Pará' },
  { value: 'Paraíba', label: 'Paraíba' }, { value: 'Paraná', label: 'Paraná' },
  { value: 'Rio de Janeiro', label: 'Rio de Janeiro' }, { value: 'Rio Grande do Norte', label: 'Rio Grande do Norte' },
  { value: 'Rio Grande do Sul', label: 'Rio Grande do Sul' }, { value: 'Santa Catarina', label: 'Santa Catarina' },
  { value: 'São Paulo', label: 'São Paulo' }, { value: 'Sergipe', label: 'Sergipe' },
]

const SEGMENTS = [
  { value: 'Agropecuário', label: 'Agropecuário' },
  { value: 'Energia', label: 'Energia' },
  { value: 'Farmacêutico', label: 'Farmacêutico' },
  { value: 'Serviços Industriais', label: 'Serviços Industriais' },
  { value: 'Tecnologia', label: 'Tecnologia' },
  { value: 'Varejo', label: 'Varejo' },
]

const DOC_TYPES = [
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'CPF', label: 'CPF' },
]

const PAISES = [{ value: 'Brasil', label: 'Brasil' }]


/* ── ellipsis menu ───────────────────────────────────────── */

function EllipsisMenu({
  onEdit, onRemove,
}: {
  onEdit: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-md text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-52 bg-white border border-[#e5e7eb] rounded-md shadow-md py-1">
          <button
            type="button"
            onClick={() => { setOpen(false); onEdit() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#030712] hover:bg-[#f3f4f6] transition-colors"
          >
            <Pencil className="w-4 h-4 text-[#6b7280] shrink-0" />
            Editar contato
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onRemove() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#dc2626] hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            Remover contato
          </button>
        </div>
      )}
    </div>
  )
}

/* ── build form ──────────────────────────────────────────── */

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

/* ── main ─────────────────────────────────────────────────── */

export function EditOrganizationSheet({ open, onClose, org, onSave, onDelete, onInativar, onActivate, canDelete }: Props) {
  const { arquitetoOptions } = useUsers()
  const [form, setForm] = useState(() => buildForm(org))
  const [contacts, setContacts] = useState<Contact[]>(org.contacts ?? [])
  const [logoPreview, setLogoPreview] = useState<string>(org.logo ?? '')
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<{ idx: number; data: ContactData } | null>(null)
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Re-sync when org prop changes
  const [lastOrg, setLastOrg] = useState(org)
  if (org !== lastOrg) {
    setLastOrg(org)
    setForm(buildForm(org))
    setContacts(org.contacts ?? [])
    setLogoPreview(org.logo ?? '')
  }

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

  function handleContactSave(data: ContactData) {
    const contact: Contact = { name: data.name, role: data.role, phone: data.phone, email: data.email }
    if (editingContact !== null) {
      setContacts(prev => prev.map((c, i) => i === editingContact.idx ? contact : c))
    } else {
      setContacts(prev => [...prev, contact])
    }
    setEditingContact(null)
  }

  function openEditContact(idx: number) {
    const c = contacts[idx]
    setEditingContact({
      idx,
      data: { name: c.name, role: c.role, country: 'Brasil (+55)', phone: c.phone, contactMethod: '', email: c.email, notes: '' },
    })
    setContactDialogOpen(true)
  }

  function hasUnsavedChanges() {
    if (isInactive) return false
    return (
      JSON.stringify(form) !== JSON.stringify(buildForm(org)) ||
      JSON.stringify(contacts) !== JSON.stringify(org.contacts ?? []) ||
      logoPreview !== (org.logo ?? '')
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
    onSave({ ...org, ...form, logo: logoPreview || undefined, contacts })
    onClose()
  }

  const isInactive = org.status === 'Inativo'

  return (
    <>
      <Sheet
        open={open}
        onClose={handleClose}
        title="Editar organização"
        width="w-[640px]"
        footer={
          <>
            {isInactive ? (
              onActivate && (
                <Button variant="ghost" onClick={onActivate} className="mr-auto text-green-700 hover:bg-green-50">
                  Ativar organização
                </Button>
              )
            ) : canDelete ? (
              onDelete && (
                <Button variant="ghost" onClick={onDelete} className="mr-auto text-red-600 hover:bg-red-50">
                  Excluir organização
                </Button>
              )
            ) : (
              onInativar && (
                <Button variant="ghost" onClick={onInativar} className="mr-auto text-amber-600 hover:bg-amber-50">
                  Inativar organização
                </Button>
              )
            )}
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            {!isInactive && <Button onClick={handleSave}>Salvar</Button>}
          </>
        }
      >
        <div className="flex flex-col gap-10">

          {/* ── Logo ─────────────────────────────────────── */}
          <div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#f3f4f6] flex items-center justify-center shrink-0 overflow-hidden border border-[#e5e7eb]">
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                  : <span className="text-sm font-semibold text-[#6b7280]">{org.name.charAt(0)}</span>
                }
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <p className="text-sm text-[#6b7280] leading-5">
                  Adicione o logotipo para facilitar a identificação da organização no sistema.
                  Tamanho recomendado: 512 × 512 px.
                </p>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={isInactive} />
                <button
                  type="button"
                  onClick={() => !isInactive && logoInputRef.current?.click()}
                  disabled={isInactive}
                  className="inline-flex items-center gap-2 h-9 px-4 border border-[#e5e7eb] rounded-md text-sm font-medium text-[#030712] bg-white hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors self-start disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4 text-[#6b7280]" />
                  Escolher imagem
                </button>
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Informações básicas ───────────────────── */}
          <div>
            <SectionTitle>Informações básicas</SectionTitle>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nome da organização" required placeholder="Nome da organização" value={form.name} onChange={e => set('name', e.target.value)} disabled={isInactive} />
                <Input label="Razão social" required placeholder="Razão social" value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} disabled={isInactive} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Tipo do documento" required options={DOC_TYPES} value={form.docType} onChange={value => set('docType', value ?? '')} disabled={isInactive} />
                <Input label="Número do documento" required placeholder="00.000.000/0000-00" value={form.docNumber} onChange={e => set('docNumber', e.target.value)} disabled={isInactive} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Segmento de negócio" required placeholder="Selecione" options={SEGMENTS} value={form.businessSegment} onChange={value => set('businessSegment', value ?? '')} disabled={isInactive} />
                <Input label="Site oficial" required placeholder="https://" value={form.officialSite} onChange={e => set('officialSite', e.target.value)} disabled={isInactive} />
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Endereço ──────────────────────────────── */}
          <div>
            <SectionTitle>Endereço</SectionTitle>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Select label="País / Região" required options={PAISES} value={form.country} onChange={value => set('country', value ?? '')} disabled={isInactive} />
                <Input label="CEP" required placeholder="00000-000" value={form.zipCode} onChange={e => set('zipCode', e.target.value)} disabled={isInactive} />
              </div>
              <Input label="Endereço postal" required placeholder="Digite o endereço completo, inclusive número" value={form.address} onChange={e => set('address', e.target.value)} disabled={isInactive} />
              <Input label="Complemento" required placeholder="Complemento do local" value={form.complement} onChange={e => set('complement', e.target.value)} disabled={isInactive} />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Estado" required placeholder="Selecione" options={STATES} value={form.state} onChange={value => set('state', value ?? '')} disabled={isInactive} />
                <Input label="Cidade" required placeholder="Cidade" value={form.city} onChange={e => set('city', e.target.value)} disabled={isInactive} />
              </div>
            </div>
          </div>

          <Divider />

          {/* ── Contatos ──────────────────────────────── */}
          <div>
            <div className="border border-[#e5e7eb] rounded-md">

              {/* header do card */}
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#030712] leading-4">
                    Contato<span className="text-[#dc2626] ml-0.5">*</span>
                  </p>
                  <p className="text-sm text-[#6b7280] leading-5 mt-1">
                    Adicione pessoas de referência para comunicação com a organização. Esses contatos não recebem acesso ao sistema automaticamente.
                  </p>
                </div>
                {!isInactive && (
                  <button
                    type="button"
                    onClick={() => { setEditingContact(null); setContactDialogOpen(true) }}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#030712] border border-[#e5e7eb] rounded-md px-3 py-1.5 hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                )}
              </div>

              {/* lista de contatos */}
              {contacts.length === 0 ? (
                <div className="border-t border-[#e5e7eb] px-4 py-4">
                  <p className="text-sm text-[#6b7280]">Nenhum contato cadastrado.</p>
                </div>
              ) : (
                contacts.map((contact, i) => (
                  <div key={i} className="border-t border-[#e5e7eb] px-4 py-3">
                    {/* nome + cargo + ⋮ */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[#030712] leading-6">{contact.name}</p>
                        {contact.role && <p className="text-sm text-[#6b7280] leading-5">{contact.role}</p>}
                      </div>
                      {!isInactive && (
                        <EllipsisMenu
                          onEdit={() => openEditContact(i)}
                          onRemove={() => setContacts(prev => prev.filter((_, j) => j !== i))}
                        />
                      )}
                    </div>

                    {/* telefone */}
                    {contact.phone && (
                      <div className="flex items-center gap-3 mt-2 border border-[#e5e7eb] rounded-xl px-4 py-3">
                        <MessageCircle className="w-5 h-5 text-[#6b7280] shrink-0" />
                        <span className="flex-1 text-sm text-[#030712] truncate">{contact.phone}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(contact.phone)}
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f3f4f6] transition-colors shrink-0"
                        >
                          <Copy className="w-4 h-4 text-[#6b7280]" />
                        </button>
                      </div>
                    )}

                    {/* email */}
                    {contact.email && (
                      <div className="flex items-center gap-3 mt-2 border border-[#e5e7eb] rounded-xl px-4 py-3">
                        <Mail className="w-5 h-5 text-[#6b7280] shrink-0" />
                        <span className="flex-1 text-sm text-[#030712] truncate">{contact.email}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(contact.email)}
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#f3f4f6] transition-colors shrink-0"
                        >
                          <Copy className="w-4 h-4 text-[#6b7280]" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <Divider />

          {/* ── Configuração PAS ──────────────────────── */}
          <div>
            <SectionTitle>Configuração PAS</SectionTitle>
            <Select
              label="Arquiteto PAS responsável"
              required
              placeholder="Selecione"
              options={arquitetoOptions}
              value={form.arquitetoPAS}
              onChange={value => set('arquitetoPAS', value ?? '')}
              disabled={isInactive}
            />
          </div>

        </div>
      </Sheet>

      <NewContactDialog
        open={contactDialogOpen}
        onClose={() => { setContactDialogOpen(false); setEditingContact(null) }}
        onAdd={handleContactSave}
        initialData={editingContact?.data}
      />

      <Dialog
        open={unsavedDialogOpen}
        onClose={() => setUnsavedDialogOpen(false)}
        title="Editar organização"
        className="max-w-md"
        footer={
          <>
            <Button variant="outline" onClick={() => setUnsavedDialogOpen(false)}>Continuar editando</Button>
            <Button onClick={() => { setUnsavedDialogOpen(false); onClose() }}>Sair sem salvar</Button>
          </>
        }
      >
        <p className="text-sm text-[#030712] leading-5">
          Existem alterações não salvas. Deseja sair mesmo assim?
        </p>
      </Dialog>
    </>
  )
}
