import { useState, useRef, useEffect } from 'react'
import { Upload, MessageCircle, Mail, MoreVertical, Plus, Pencil, Trash2, Copy } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { AddContatoDialog, type Contato } from './AddContatoDialog'
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
  onInativar?: () => void
  onActivate?: () => void
}

/* ── helpers ─────────────────────────────────────────────── */

function contatoFromContact(c: Contact): Contato {
  return {
    nome: c.name,
    cargo: c.role,
    telefones: [{ pais: 'Brasil (+55)', numero: c.phone, meio: '' }],
    emails: [c.email],
    observacao: '',
  }
}

function contactFromContato(c: Contato): Contact {
  return {
    name: c.nome,
    role: c.cargo,
    phone: c.telefones.find(t => t.numero.trim())?.numero ?? '',
    email: c.emails.find(e => e.trim()) ?? '',
  }
}

/* ── EllipsisMenu ────────────────────────────────────────── */

function EllipsisMenu({
  onEdit,
  onRemove,
  editLabel,
  removeLabel,
}: {
  onEdit: () => void
  onRemove: () => void
  editLabel: string
  removeLabel: string
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
            {editLabel}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onRemove() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#dc2626] hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            {removeLabel}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── ImageUploadRow ──────────────────────────────────────── */

function ImageUploadRow({
  description,
  preview,
  onFileSelect,
  disabled,
}: {
  description: string
  preview: string
  onFileSelect: (dataUrl: string) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onFileSelect(ev.target?.result as string)
    reader.readAsDataURL(file)
  }
  return (
    <div className="flex items-start gap-7">
      <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0 overflow-hidden border border-[#e5e7eb]">
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-200 rounded-full" />
        }
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <p className="text-sm text-[#6b7280] leading-5">{description}</p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={disabled} />
        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 border border-[#e5e7eb] rounded-md px-4 h-9 text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors self-start"
          >
            <Upload className="w-4 h-4 text-[#6b7280]" />
            Escolher imagem
          </button>
        )}
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

export function EditAccountSheet({ open, onClose, account, org, onSave, onUpdateContacts, onDelete, onInativar, onActivate }: Props) {
  const isInactive = account.status === 'Inativo'
  const [logo, setLogo] = useState(account.logo ?? '')
  const [favicon, setFavicon] = useState('')
  const [banner, setBanner] = useState('')

  const [form, setForm] = useState({
    name:            account.name,
    razaoSocial:     account.razaoSocial    ?? org.razaoSocial    ?? '',
    tipoDocumento:   account.tipoDocumento  ?? org.docType        ?? 'CNPJ',
    numeroDocumento: account.numeroDocumento ?? org.docNumber     ?? '',
    segmentoNegocio: account.segmentoNegocio ?? org.businessSegment ?? '',
    siteOficial:     account.siteOficial    ?? org.officialSite   ?? '',
    pais:            account.pais           ?? org.country        ?? 'brasil',
    cep:             account.cep            ?? org.zipCode        ?? '',
    endereco:        account.endereco       ?? org.address        ?? '',
    complemento:     account.complemento    ?? org.complement     ?? '',
    estado:          account.estado         ?? org.state          ?? '',
    cidade:          account.cidade         ?? org.city           ?? '',
    arquitetoPAS:    account.arquitetoPAS,
    descricao:       account.descricao      ?? '',
  })

  const [contatos, setContatos] = useState<Contato[]>(() => org.contacts.map(contatoFromContact))
  const [showContatoDialog, setShowContatoDialog] = useState(false)
  const [editingContatoIdx, setEditingContatoIdx] = useState<number | null>(null)

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [editingAdminIdx, setEditingAdminIdx] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      setForm({
        name:            account.name,
        razaoSocial:     account.razaoSocial    ?? org.razaoSocial    ?? '',
        tipoDocumento:   account.tipoDocumento  ?? org.docType        ?? 'CNPJ',
        numeroDocumento: account.numeroDocumento ?? org.docNumber     ?? '',
        segmentoNegocio: account.segmentoNegocio ?? org.businessSegment ?? '',
        siteOficial:     account.siteOficial    ?? org.officialSite   ?? '',
        pais:            account.pais           ?? org.country        ?? 'brasil',
        cep:             account.cep            ?? org.zipCode        ?? '',
        endereco:        account.endereco       ?? org.address        ?? '',
        complemento:     account.complemento    ?? org.complement     ?? '',
        estado:          account.estado         ?? org.state          ?? '',
        cidade:          account.cidade         ?? org.city           ?? '',
        arquitetoPAS:    account.arquitetoPAS,
        descricao:       account.descricao      ?? '',
      })
      setContatos(org.contacts.map(contatoFromContact))
      setLogo(account.logo ?? '')
    }
  }, [open, account, org])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function openEditContato(idx: number) {
    setEditingContatoIdx(idx)
    setShowContatoDialog(true)
  }

  function openEditAdmin(idx: number) {
    setEditingAdminIdx(idx)
    setShowAdminDialog(true)
  }

  function handleContatoAdd(contato: Contato) {
    let updated: Contato[]
    if (editingContatoIdx !== null) {
      updated = contatos.map((c, i) => i === editingContatoIdx ? contato : c)
    } else {
      updated = [...contatos, contato]
    }
    setContatos(updated)
    onUpdateContacts?.(updated.map(contactFromContato))
    setEditingContatoIdx(null)
  }

  function handleAdminAdd(admin: AdminUser) {
    if (editingAdminIdx !== null) {
      setAdmins(prev => prev.map((a, i) => i === editingAdminIdx ? admin : a))
    } else {
      setAdmins(prev => [...prev, admin])
    }
    setEditingAdminIdx(null)
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
      logo:            logo || undefined,
    })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Editar Conta"
        width="w-[640px]"
        footer={
          <>
            {isInactive ? (
              onActivate && (
                <Button variant="ghost" onClick={onActivate} className="mr-auto text-green-700 hover:bg-green-50">
                  Ativar conta
                </Button>
              )
            ) : (
              onInativar && (
                <Button variant="ghost" onClick={onInativar} className="mr-auto text-amber-600 hover:bg-amber-50">
                  Inativar conta
                </Button>
              )
            )}
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            {!isInactive && <Button onClick={handleSave}>Salvar</Button>}
          </>
        }
      >
        <div className="flex flex-col gap-10">

          {/* Imagens */}
          <div className="flex flex-col gap-7">
            <ImageUploadRow
              description="Insira o logo da conta. Isso ajudará a identificar a conta de forma mais fácil e visual no sistema."
              preview={logo}
              onFileSelect={setLogo}
              disabled={isInactive}
            />
            <ImageUploadRow
              description="Insira o favicon da conta. Isso será exibido na aba do navegador. Formato: 64×64 pixels."
              preview={favicon}
              onFileSelect={setFavicon}
              disabled={isInactive}
            />
            <ImageUploadRow
              description="Insira o banner da conta. Isso será exibido na tela de login. Formato: 180×180 pixels."
              preview={banner}
              onFileSelect={setBanner}
              disabled={isInactive}
            />
            <div className="border-t border-gray-200" />
          </div>

          {/* Informações básicas */}
          <div className="flex flex-col gap-7">
            <p className="text-base font-bold text-[#030712] leading-6">Informações básicas</p>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Nome da conta" required placeholder="Nome da conta" value={form.name} onChange={e => set('name', e.target.value)} disabled={isInactive} />
              <Input label="Razão Social" required placeholder="Razão Social" value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} disabled={isInactive} />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-[#030712]">Descrição</label>
              <textarea
                placeholder="Digite uma descrição para a conta"
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)}
                rows={3}
                disabled={isInactive}
                className="w-full min-h-[64px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-[#f9fafb] disabled:text-[#9ca3af] disabled:cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Tipo do documento" options={DOC_TYPES} value={form.tipoDocumento} onChange={e => set('tipoDocumento', e.target.value)} disabled={isInactive} />
              <Input label="Número do documento" required placeholder="00.000.000/0000-00" value={form.numeroDocumento} onChange={e => set('numeroDocumento', e.target.value)} disabled={isInactive} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Segmento de negócio" placeholder="Selecione" options={SEGMENTOS} value={form.segmentoNegocio} onChange={e => set('segmentoNegocio', e.target.value)} disabled={isInactive} />
              <Input label="Site oficial" required placeholder="https://" value={form.siteOficial} onChange={e => set('siteOficial', e.target.value)} disabled={isInactive} />
            </div>

            <div className="border-t border-gray-200" />
          </div>

          {/* Endereço */}
          <div className="flex flex-col gap-7">
            <p className="text-base font-bold text-[#030712] leading-6">Endereço</p>

            <div className="grid grid-cols-2 gap-4">
              <Select label="País / Região" options={PAISES} value={form.pais} onChange={e => set('pais', e.target.value)} disabled={isInactive} />
              <Input label="CEP" required placeholder="00000-000" value={form.cep} onChange={e => set('cep', e.target.value)} disabled={isInactive} />
            </div>
            <Input label="Endereço postal" required placeholder="Rua, Avenida..." value={form.endereco} onChange={e => set('endereco', e.target.value)} disabled={isInactive} />
            <Input label="Complemento" required placeholder="Número, apartamento..." value={form.complemento} onChange={e => set('complemento', e.target.value)} disabled={isInactive} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Estado" placeholder="Selecione" options={ESTADOS} value={form.estado} onChange={e => set('estado', e.target.value)} disabled={isInactive} />
              <Input label="Cidade" required placeholder="Cidade" value={form.cidade} onChange={e => set('cidade', e.target.value)} disabled={isInactive} />
            </div>

            <div className="border-t border-gray-200" />
          </div>

          {/* Configuração PAS */}
          <div className="flex flex-col gap-7">
            <p className="text-base font-bold text-[#030712] leading-6">Configuração PAS</p>

            <Select label="Arquiteto PAS responsável" required placeholder="Selecione" options={ARQUITETOS} value={form.arquitetoPAS} onChange={e => set('arquitetoPAS', e.target.value)} />

            <div className="border-t border-gray-200" />
          </div>

          {/* Contatos */}
          <div className="flex flex-col gap-4">

            {/* Contatos card */}
            <div className="border border-[#e5e7eb] rounded-md">
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#030712]">
                    Contatos<span className="text-[#dc2626]">*</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingContatoIdx(null); setShowContatoDialog(true) }}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#030712] border border-[#e5e7eb] rounded-md px-3 py-1.5 hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>

              {contatos.map((c, i) => {
                const phones = c.telefones.filter(t => t.numero.trim())
                const emails = c.emails.filter(e => e.trim())
                return (
                  <div key={i} className="border-t border-[#e5e7eb] px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-[#030712] leading-6">{c.nome}</p>
                        {c.cargo && <p className="text-sm text-[#6b7280] leading-5">{c.cargo}</p>}
                      </div>
                      <EllipsisMenu
                        onEdit={() => openEditContato(i)}
                        onRemove={() => {
                          const updated = contatos.filter((_, idx) => idx !== i)
                          setContatos(updated)
                          onUpdateContacts?.(updated.map(contactFromContato))
                        }}
                        editLabel="Editar contato"
                        removeLabel="Remover contato"
                      />
                    </div>
                    {phones.map((t, pi) => (
                      <div key={pi} className="flex items-center gap-3 mt-2 border border-[#e5e7eb] rounded-xl px-4 py-3">
                        <MessageCircle className="w-4 h-4 text-[#030712] shrink-0" />
                        <span className="flex-1 text-sm text-[#030712] truncate">{t.numero}</span>
                        <button type="button" onClick={() => navigator.clipboard.writeText(t.numero)} className="text-[#6b7280] hover:text-[#030712] transition-colors shrink-0">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {emails.map((email, ei) => (
                      <div key={ei} className="flex items-center gap-3 mt-2 border border-[#e5e7eb] rounded-xl px-4 py-3">
                        <Mail className="w-4 h-4 text-[#030712] shrink-0" />
                        <span className="flex-1 text-sm text-[#030712] truncate">{email}</span>
                        <button type="button" onClick={() => navigator.clipboard.writeText(email)} className="text-[#6b7280] hover:text-[#030712] transition-colors shrink-0">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {/* Usuário administrador card */}
            <div className="border border-[#e5e7eb] rounded-md">
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#030712]">
                    Usuário administrador<span className="text-[#dc2626]">*</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEditingAdminIdx(null); setShowAdminDialog(true) }}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#030712] border border-[#e5e7eb] rounded-md px-3 py-1.5 hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>

              {admins.map((a, i) => (
                <div key={i} className="border-t border-[#e5e7eb] px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-[#030712] leading-6">{a.nome} {a.sobrenome}</p>
                      <p className="text-sm text-[#6b7280] leading-5">{a.email}</p>
                    </div>
                    <EllipsisMenu
                      onEdit={() => openEditAdmin(i)}
                      onRemove={() => setAdmins(prev => prev.filter((_, idx) => idx !== i))}
                      editLabel="Editar usuário"
                      removeLabel="Remover usuário"
                    />
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      </Sheet>

      <AddContatoDialog
        open={showContatoDialog}
        onClose={() => { setShowContatoDialog(false); setEditingContatoIdx(null) }}
        onAdd={handleContatoAdd}
        initialContato={editingContatoIdx !== null ? contatos[editingContatoIdx] : undefined}
      />
      <AddAdminDialog
        open={showAdminDialog}
        onClose={() => { setShowAdminDialog(false); setEditingAdminIdx(null) }}
        onAdd={handleAdminAdd}
        initialAdmin={editingAdminIdx !== null ? admins[editingAdminIdx] : undefined}
      />
    </>
  )
}
