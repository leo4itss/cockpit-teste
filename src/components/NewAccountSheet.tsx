import { useState, useRef, useEffect } from 'react'
import { useUsers } from '@/context/UsersContext'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { useToast, ToastContainer } from './ui/Toast'
import { Plus, Upload, MessageCircle, Phone, Copy, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import type { Account } from '@/types'
import { AddContatoDialog, type Contato } from './AddContatoDialog'
import { AddAdminDialog, type AdminUser } from './AddAdminDialog'

interface Props {
  open: boolean
  onClose: () => void
  orgId: string
  onSave: (account: Omit<Account, 'id'>) => void
}

const DOCUMENT_TYPES = [
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'CPF', label: 'CPF' },
]

const BUSINESS_SEGMENTS = [
  { value: 'varejo', label: 'Varejo' },
  { value: 'industria', label: 'Indústria' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'tecnologia', label: 'Tecnologia' },
]

const STATES = [
  { value: 'SP', label: 'SP' },
  { value: 'RJ', label: 'RJ' },
  { value: 'MG', label: 'MG' },
  { value: 'RS', label: 'RS' },
  { value: 'PR', label: 'PR' },
]


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
  onError,
  onSuccess,
}: {
  description: string
  preview: string
  onFileSelect: (dataUrl: string) => void
  onError?: () => void
  onSuccess?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = ['image/jpeg', 'image/png']
    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (!validTypes.includes(file.type) || file.size > maxSize) {
      onError?.()
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      onFileSelect(ev.target?.result as string)
      onSuccess?.()
    }
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
        <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleChange} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 border border-[#e5e7eb] rounded-md px-4 h-9 text-sm font-medium text-[#030712] hover:bg-gray-50 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors self-start"
        >
          <Upload className="w-4 h-4 text-[#6b7280]" />
          Escolher imagem
        </button>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────── */

export function NewAccountSheet({ open, onClose, orgId, onSave }: Props) {
  const { arquitetoOptions } = useUsers()
  const { toasts, toast, dismiss } = useToast()
  const [logo, setLogo] = useState('')
  const [favicon, setFavicon] = useState('')
  const [banner, setBanner] = useState('')

  const [contatos, setContatos] = useState<Contato[]>([])
  const [showContatoDialog, setShowContatoDialog] = useState(false)
  const [editingContatoIdx, setEditingContatoIdx] = useState<number | null>(null)

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [editingAdminIdx, setEditingAdminIdx] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: '',
    razaoSocial: '',
    tipoDocumento: '',
    numeroDocumento: '',
    segmento: '',
    siteOficial: '',
    pais: 'Brasil',
    cep: '',
    enderecoPostal: '',
    complemento: '',
    estado: '',
    cidade: '',
    arquitetoPAS: '',
    subdomain: '',
    descricao: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const canSave =
    form.name.trim() !== '' &&
    form.razaoSocial.trim() !== '' &&
    form.tipoDocumento !== '' &&
    form.numeroDocumento.trim() !== '' &&
    form.segmento !== '' &&
    form.siteOficial.trim() !== '' &&
    form.pais !== '' &&
    form.cep.trim() !== '' &&
    form.enderecoPostal.trim() !== '' &&
    form.complemento.trim() !== '' &&
    form.estado !== '' &&
    form.cidade.trim() !== '' &&
    form.arquitetoPAS !== '' &&
    form.subdomain.trim() !== '' &&
    contatos.length > 0 &&
    admins.length > 0

  function openEditContato(idx: number) {
    setEditingContatoIdx(idx)
    setShowContatoDialog(true)
  }

  function openEditAdmin(idx: number) {
    setEditingAdminIdx(idx)
    setShowAdminDialog(true)
  }

  function handleContatoAdd(contato: Contato) {
    if (editingContatoIdx !== null) {
      setContatos(prev => prev.map((c, i) => i === editingContatoIdx ? contato : c))
    } else {
      setContatos(prev => [...prev, contato])
      toast('Contato adicionado com sucesso.', 'success')
    }
    setEditingContatoIdx(null)
  }

  function handleAdminAdd(admin: AdminUser) {
    if (editingAdminIdx !== null) {
      setAdmins(prev => prev.map((a, i) => i === editingAdminIdx ? admin : a))
    } else {
      setAdmins(prev => [...prev, admin])
      toast('Usuário administrador definido com sucesso.', 'success')
    }
    setEditingAdminIdx(null)
  }

  function handleSave() {
    onSave({
      orgId,
      name: form.name,
      subdomain: form.subdomain,
      arquitetoPAS: form.arquitetoPAS,
      logo: logo || undefined,
      admins,
      provisioningStatus: 'PENDING',
      status: 'Criado',
      createdAt: new Date().toLocaleDateString('pt-BR'),
    })
    resetForm()
    onClose()
  }

  function resetForm() {
    setForm({ name: '', razaoSocial: '', tipoDocumento: '', numeroDocumento: '', segmento: '', siteOficial: '', pais: 'Brasil', cep: '', enderecoPostal: '', complemento: '', estado: '', cidade: '', arquitetoPAS: '', subdomain: '', descricao: '' })
    setLogo('')
    setFavicon('')
    setBanner('')
    setContatos([])
    setAdmins([])
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
        title="Nova Conta"
        width="w-[640px]"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!canSave}>Criar Conta</Button>
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
              onSuccess={() => toast('Imagem adicionada com sucesso.', 'success')}
              onError={() => toast('Não foi possível enviar a imagem. Use JPG ou PNG com até 10 MB.', 'error')}
            />
            <ImageUploadRow
              description="Insira o favicon da conta. Isso será exibido na aba do navegador. Formato: 64×64 pixels."
              preview={favicon}
              onFileSelect={setFavicon}
              onSuccess={() => toast('Imagem adicionada com sucesso.', 'success')}
              onError={() => toast('Não foi possível enviar a imagem. Use JPG ou PNG com até 10 MB.', 'error')}
            />
            <ImageUploadRow
              description="Insira o banner da conta. Isso será exibido na tela de login. Formato: 180×180 pixels."
              preview={banner}
              onFileSelect={setBanner}
              onSuccess={() => toast('Imagem adicionada com sucesso.', 'success')}
              onError={() => toast('Não foi possível enviar a imagem. Use JPG ou PNG com até 10 MB.', 'error')}
            />
            <div className="border-t border-gray-200" />
          </div>

          {/* Informações básicas */}
          <div className="flex flex-col gap-7">
            <p className="text-base font-bold text-[#030712] leading-6">Informações básicas</p>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Nome da conta" required placeholder="Digite o nome da conta" value={form.name} onChange={e => set('name', e.target.value)} />
              <Input label="Razão Social" required placeholder="Qual a razão social?" value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-[#030712]">Descrição</label>
              <textarea
                className="w-full min-h-[64px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Digite uma descrição para a conta"
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Tipo do documento" required options={DOCUMENT_TYPES} placeholder="Selecione" value={form.tipoDocumento} onChange={e => set('tipoDocumento', e.target.value)} />
              <Input label="Número do documento" required placeholder="Escolha um tipo" disabled={!form.tipoDocumento} value={form.numeroDocumento} onChange={e => set('numeroDocumento', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select label="Segmento de negócio" required options={BUSINESS_SEGMENTS} placeholder="Escolha o segmento" value={form.segmento} onChange={e => set('segmento', e.target.value)} />
              <Input label="Site oficial" required placeholder="http://" value={form.siteOficial} onChange={e => set('siteOficial', e.target.value)} />
            </div>

            <div className="border-t border-gray-200" />
          </div>

          {/* Endereço */}
          <div className="flex flex-col gap-7">
            <p className="text-base font-bold text-[#030712] leading-6">Endereço</p>

            <div className="grid grid-cols-2 gap-4">
              <Select label="País / Região" required options={[{ value: 'Brasil', label: 'Brasil' }]} value={form.pais} onChange={e => set('pais', e.target.value)} />
              <Input label="CEP" required placeholder="Código postal" value={form.cep} onChange={e => set('cep', e.target.value)} />
            </div>
            <Input label="Endereço postal" required placeholder="Digite o endereço completo, inclusive número" value={form.enderecoPostal} onChange={e => set('enderecoPostal', e.target.value)} />
            <Input label="Complemento" required placeholder="Complemento do local" value={form.complemento} onChange={e => set('complemento', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Estado" required options={STATES} placeholder="Selecione" value={form.estado} onChange={e => set('estado', e.target.value)} />
              <Input label="Cidade" required placeholder="Digite a cidade" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
            </div>

            <div className="border-t border-gray-200" />
          </div>

          {/* Configuração PAS */}
          <div className="flex flex-col gap-7">
            <p className="text-base font-bold text-[#030712] leading-6">Configuração PAS</p>

            <Select label="Arquiteto PAS responsável" required options={arquitetoOptions} placeholder="Escolha o arquiteto" value={form.arquitetoPAS} onChange={e => set('arquitetoPAS', e.target.value)} />
            <Input label="Subdomínio" required placeholder="Nome do domínio" value={form.subdomain} onChange={e => set('subdomain', e.target.value)} />
          </div>

          {/* Contatos e Usuário administrador */}
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
                        onRemove={() => setContatos(prev => prev.filter((_, idx) => idx !== i))}
                        editLabel="Editar contato"
                        removeLabel="Remover contato"
                      />
                    </div>
                    {phones.map((t, pi) => (
                      <div key={pi} className="flex items-center gap-3 mt-2 border border-[#e5e7eb] rounded-xl px-4 py-3">
                        {t.meio === 'chat'
                          ? <MessageCircle className="w-4 h-4 text-[#030712] shrink-0" />
                          : <Phone className="w-4 h-4 text-[#030712] shrink-0" />
                        }
                        <span className="flex-1 text-sm text-[#030712] truncate">{t.numero}</span>
                        <button type="button" onClick={() => navigator.clipboard.writeText(t.numero)} className="text-[#6b7280] hover:text-[#030712] transition-colors shrink-0">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {emails.map((email, ei) => (
                      <div key={ei} className="flex items-center gap-3 mt-2 border border-[#e5e7eb] rounded-xl px-4 py-3">
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
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
