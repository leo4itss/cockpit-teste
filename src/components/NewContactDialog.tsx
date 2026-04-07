import { useState, useEffect } from 'react'
import { MessageCircle, Phone, Plus } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'

export interface ContactData {
  name: string
  role: string
  country: string
  phone: string
  contactMethod: 'whatsapp' | 'phone' | ''
  email: string
  notes: string
}

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (contact: ContactData) => void
  initialData?: ContactData
}

const COUNTRIES = [
  { value: 'Brasil (+55)', label: 'Brasil (+55)' },
  { value: 'EUA (+1)', label: 'EUA (+1)' },
  { value: 'Portugal (+351)', label: 'Portugal (+351)' },
]

const emptyForm: ContactData = {
  name: '',
  role: '',
  country: 'Brasil (+55)',
  phone: '',
  contactMethod: '',
  email: '',
  notes: '',
}

export function NewContactDialog({ open, onClose, onAdd, initialData }: Props) {
  const [form, setForm] = useState<ContactData>(initialData ?? emptyForm)

  useEffect(() => {
    if (open) setForm(initialData ?? emptyForm)
  }, [open])

  function set<K extends keyof ContactData>(field: K, value: ContactData[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleAdd() {
    onAdd(form)
    setForm(emptyForm)
    onClose()
  }

  function handleClose() {
    setForm(emptyForm)
    onClose()
  }

  const isEdit = !!initialData

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Editar contato' : 'Novo contato'}
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleAdd}>{isEdit ? 'Salvar' : 'Adicionar'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">

        {/* Nome da organização */}
        <div className="w-[352px]">
          <Input
            label="Nome da organização"
            required
            placeholder="Digite o nome da organização"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>

        {/* Cargo */}
        <div className="w-[352px]">
          <Input
            label="Cargo"
            required
            placeholder="Digite o cargo"
            value={form.role}
            onChange={e => set('role', e.target.value)}
          />
        </div>

        {/* Linha de telefone: País/Região + Número + Meio de contato + botão + */}
        <div className="flex items-end gap-2">
          {/* País / Região */}
          <div className="flex-1 min-w-0">
            <Select
              label="País / Região"
              options={COUNTRIES}
              value={form.country}
              onChange={e => set('country', e.target.value)}
            />
          </div>

          {/* Número */}
          <div className="flex-1 min-w-0">
            <Input
              label="Número"
              placeholder="62 9 9679-7176"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
            />
          </div>

          {/* Meio de contato */}
          <div className="flex flex-col gap-3 shrink-0">
            <span className="text-sm font-medium text-[#030712] leading-5">Meio de contato</span>
            <div className="flex items-center gap-2">
              {/* WhatsApp / Mensagem */}
              <button
                type="button"
                title="WhatsApp / Mensagem"
                onClick={() => set('contactMethod', form.contactMethod === 'whatsapp' ? '' : 'whatsapp')}
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-md border shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors bg-white border-[#e5e7eb] hover:border-gray-300"
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    form.contactMethod === 'whatsapp'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-[#e5e7eb] bg-white'
                  }`}
                >
                  {form.contactMethod === 'whatsapp' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <MessageCircle className="w-4 h-4 text-[#6b7280]" />
              </button>

              {/* Telefone */}
              <button
                type="button"
                title="Telefone"
                onClick={() => set('contactMethod', form.contactMethod === 'phone' ? '' : 'phone')}
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-md border shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] transition-colors bg-white border-[#e5e7eb] hover:border-gray-300"
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    form.contactMethod === 'phone'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-[#e5e7eb] bg-white'
                  }`}
                >
                  {form.contactMethod === 'phone' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <Phone className="w-4 h-4 text-[#6b7280]" />
              </button>
            </div>
          </div>

          {/* Adicionar outro número */}
          <button
            type="button"
            title="Adicionar outro número"
            className="w-8 h-8 flex items-center justify-center rounded-full border border-[#e5e7eb] bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 text-[#030712]" />
          </button>
        </div>

        {/* Separador */}
        <div className="border-t border-[#e5e7eb]" />

        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="marcelo.gomes@grupoitss.com.br"
          value={form.email}
          onChange={e => set('email', e.target.value)}
        />

        {/* Observação */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[#030712]">Observação</label>
          <textarea
            className="h-16 min-h-[64px] w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Anote aqui observações sobre esse contato"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>

      </div>
    </Modal>
  )
}
