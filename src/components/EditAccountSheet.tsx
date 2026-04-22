import { useState, useRef, useEffect } from 'react'
import { Upload, MessageCircleMore, Mail, MoreVertical, Plus, Copy, Pencil, Trash2 } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { NewContactDialog, type ContactData } from './NewContactDialog'
import { AddAdminDialog, type AdminUser } from './AddAdminDialog'
import type { Account, Organization, Contact } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  account: Account
  org: Organization
  onSave: (account: Account) => void
  onUpdateContacts?: (contacts: Contact[]) => void
  onDelete?: () => void
}

/* ── sub-components ────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
  )
}

function Divider() {
  return <div className="border-t border-gray-100 w-full" />
}

function ImageRow({ description }: { description: string }) {
  return (
    <div className="flex gap-7 items-start">
      <div className="w-12 h-12 rounded-full border border-gray-200 bg-gray-100 shrink-0 overflow-hidden" />
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <p className="text-sm font-normal text-[#6b7280] leading-5">{description}</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 h-9 px-4 border border-gray-200 rounded-md text-sm font-medium text-[#030712] bg-white hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors w-fit"
        >
          <Upload className="w-4 h-4 text-[#6b7280]" />
          Escolher imagem
        </button>
      </div>
    </div>
  )
}

/* ── options ─────────────────────────────────────────────── */

const ARQUITETOS = [
  { value: 'marcelo', label: 'Marcelo Gomes' },
  { value: 'ana', label: 'Ana Lima' },
]

const DOC_TYPES = [
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'CPF', label: 'CPF' },
]

const SEGMENTOS = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'farmaceutico', label: 'Farmacêutico' },
  { value: 'varejo', label: 'Varejo' },
  { value: 'energia', label: 'Energia' },
  { value: 'agropecuario', label: 'Agropecuário' },
]

const PAISES = [
  { value: 'brasil', label: 'Brasil' },
  { value: 'eua', label: 'Estados Unidos' },
  { value: 'portugal', label: 'Portugal' },
]

const ESTADOS = [
  { value: 'go', label: 'Goiás' },
  { value: 'sp', label: 'São Paulo' },
  { value: 'rj', label: 'Rio de Janeiro' },
  { value: 'mg', label: 'Minas Gerais' },
  { value: 'rs', label: 'Rio Grande do Sul' },
  { value: 'pr', label: 'Paraná' },
  { value: 'pb', label: 'Paraíba' },
]

/* ── main ─────────────────────────────────────────────────── */

export function EditAccountSheet({ open, onClose, account, org, onSave, onUpdateContacts }: Props) {
  const [form, setForm] = useState({
    name:           account.name,
    razaoSocial:    account.razaoSocial    ?? org.razaoSocial    ?? '',
    tipoDocumento:  account.tipoDocumento  ?? org.docType        ?? 'CNPJ',
    numeroDocumento:account.numeroDocumento?? org.docNumber      ?? '',
    segmentoNegocio:account.segmentoNegocio?? org.businessSegment?? '',
    siteOficial:    account.siteOficial    ?? org.officialSite   ?? '',
    pais:           account.pais           ?? org.country        ?? 'brasil',
    cep:            account.cep            ?? org.zipCode        ?? '',
    endereco:       account.endereco       ?? org.address        ?? '',
    complemento:    account.complemento    ?? org.complement     ?? '',
    estado:         account.estado         ?? org.state          ?? '',
    cidade:         account.cidade         ?? org.city           ?? '',
    arquitetoPAS:   account.arquitetoPAS,
    descricao:      account.descricao      ?? '',
  })

  const [localContacts, setLocalContacts] = useState<Contact[]>(org.contacts)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<{ idx: number; data: ContactData } | null>(null)
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)

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

  function handleContactAdd(data: ContactData) {
    const contact: Contact = { name: data.name, role: data.role, phone: data.phone, email: data.email }
    const updated = editingContact !== null
      ? localContacts.map((c, i) => i === editingContact.idx ? contact : c)
      : [...localContacts, contact]
    setLocalContacts(updated)
    onUpdateContacts?.(updated)
    setEditingContact(null)
  }

  function handleDeleteContact(idx: number) {
    const updated = localContacts.filter((_, i) => i !== idx)
    setLocalContacts(updated)
    onUpdateContacts?.(updated)
    setOpenMenuIdx(null)
  }

  function handleEditContact(idx: number) {
    const c = localContacts[idx]
    setEditingContact({ idx, data: { name: c.name, role: c.role, country: 'Brasil (+55)', phone: c.phone, contactMethod: '', email: c.email, notes: '' } })
    setOpenMenuIdx(null)
    setContactDialogOpen(true)
  }

  function handleSave() {
    onSave({
      ...account,
      name:            form.name,
      razaoSocial:     form.razaoSocial,
      tipoDocumento:   form.tipoDocumento,
      numeroDocumento: form.numeroDocumento,
      segmentoNegocio: form.segmentoNegocio,
      siteOficial:     form.siteOficial,
      pais:            form.pais,
      cep:             form.cep,
      endereco:        form.endereco,
      complemento:     form.complemento,
      estado:          form.estado,
      cidade:          form.cidade,
      arquitetoPAS:    form.arquitetoPAS,
      descricao:       form.descricao,
    })
    onClose()
  }

  return (
    <>
    <Sheet
      open={open}
      onClose={onClose}
      title="Editar Conta"
      width="w-[768px]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-10">

        {/* ── Imagens ──────────────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <ImageRow description="Insira o logo da organização. Isso ajudará a identificar a organização de forma mais fácil e visual no sistema." />
          <ImageRow description="Insira o favicon da conta. Isso será exibido na aba do navegador. Formato: 64×64 pixels." />
          <ImageRow description="Insira o banner da conta. Isso será exibido na tela de login. Formato: 180×180 pixels." />
          <Divider />
        </div>

        {/* ── Informações básicas ───────────────────────────── */}
        <div className="flex flex-col gap-7">
          <SectionTitle>Informações básicas</SectionTitle>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome da conta"
              required
              placeholder="Nome da conta"
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

          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-[#030712]">Descrição</label>
            <textarea
              placeholder="Digite uma descrição para a conta"
              value={form.descricao}
              onChange={e => set('descricao', e.target.value)}
              rows={3}
              className="h-16 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo do documento"
              options={DOC_TYPES}
              value={form.tipoDocumento}
              onChange={e => set('tipoDocumento', e.target.value)}
            />
            <Input
              label="Número do documento"
              required
              placeholder="00.000.000/0000-00"
              value={form.numeroDocumento}
              onChange={e => set('numeroDocumento', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Segmento de negócio"
              placeholder="Selecione"
              options={SEGMENTOS}
              value={form.segmentoNegocio}
              onChange={e => set('segmentoNegocio', e.target.value)}
            />
            <Input
              label="Site oficial"
              required
              placeholder="https://"
              value={form.siteOficial}
              onChange={e => set('siteOficial', e.target.value)}
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
              value={form.pais}
              onChange={e => set('pais', e.target.value)}
            />
            <Input
              label="CEP"
              required
              placeholder="00000-000"
              value={form.cep}
              onChange={e => set('cep', e.target.value)}
            />
          </div>

          <Input
            label="Endereço postal"
            required
            placeholder="Rua, Avenida..."
            value={form.endereco}
            onChange={e => set('endereco', e.target.value)}
          />

          <Input
            label="Complemento"
            required
            placeholder="Número, apartamento..."
            value={form.complemento}
            onChange={e => set('complemento', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Estado"
              placeholder="Selecione"
              options={ESTADOS}
              value={form.estado}
              onChange={e => set('estado', e.target.value)}
            />
            <Input
              label="Cidade"
              required
              placeholder="Cidade"
              value={form.cidade}
              onChange={e => set('cidade', e.target.value)}
            />
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

          <Input
            label="Subdomínio"
            required
            value={account.subdomain}
            disabled
          />

          <Divider />
        </div>

        {/* ── Contatos ─────────────────────────────────────── */}
        <div className="flex flex-col gap-7">
          <div className="border border-gray-200 rounded-md bg-white px-5 pt-2 pb-4 flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between py-4">
              <p className="text-sm font-medium text-[#030712]">
                Contato<span className="text-red-600">*</span>
              </p>
              <Button variant="outline" size="sm" onClick={() => { setEditingContact(null); setContactDialogOpen(true) }}>
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            </div>

            <div className="border-t border-gray-100" />

            {localContacts.length === 0 ? (
              <p className="text-sm text-[#6b7280] py-4">Nenhum contato cadastrado.</p>
            ) : (
              localContacts.map((contact, i) => (
                <div key={i}>
                  {/* Contact name/role */}
                  <div className="flex items-start gap-4 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#030712] leading-4">{contact.name}</p>
                      <p className="text-sm font-normal text-[#6b7280] leading-5 mt-1">{contact.role}</p>
                    </div>
                    <div className="relative shrink-0" ref={openMenuIdx === i ? menuRef : undefined}>
                      <button
                        type="button"
                        onClick={() => setOpenMenuIdx(openMenuIdx === i ? null : i)}
                        className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-100 text-[#030712] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenuIdx === i && (
                        <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded-md shadow-md py-1 min-w-[128px]">
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

                  {/* Phone / email items */}
                  <div className="flex flex-col gap-2 pb-2">
                    <div className="border border-gray-200 rounded-md flex items-center gap-4 px-4 h-10">
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
                    <div className="border border-gray-200 rounded-md flex items-center gap-4 px-4 h-10">
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
                  </div>
                </div>
              ))
            )}
          </div>

          <Divider />
        </div>

        {/* ── Usuário administrador ─────────────────────────── */}
        <div className="border border-gray-200 rounded-md bg-white px-5 pt-2 pb-4 flex flex-col">
          <div className="flex items-center justify-between py-4">
            <p className="text-sm font-medium text-[#030712]">
              Usuário administrador<span className="text-red-600">*</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => setAdminDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Button>
          </div>

          {admins.length > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <div className="flex flex-col gap-3 pt-4">
                {admins.map((admin, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-md px-4 py-2.5">
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-medium text-[#030712]">{admin.nome} {admin.sobrenome}</p>
                      <p className="text-xs text-[#6b7280]">{admin.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdmins(prev => prev.filter((_, idx) => idx !== i))}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </Sheet>

    <NewContactDialog
      open={contactDialogOpen}
      onClose={() => { setContactDialogOpen(false); setEditingContact(null) }}
      onAdd={handleContactAdd}
      initialData={editingContact?.data}
    />

    <AddAdminDialog
      open={adminDialogOpen}
      onClose={() => setAdminDialogOpen(false)}
      onAdd={admin => setAdmins(prev => [...prev, admin])}
    />
    </>
  )
}
