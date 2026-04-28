import { useState, useEffect } from 'react'
import { Plus, MessageCircle, Phone } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (contato: Contato) => void
  initialContato?: Contato
}

export interface Contato {
  nome: string
  cargo: string
  telefones: TelefoneEntry[]
  emails: string[]
  observacao: string
}

interface TelefoneEntry {
  pais: string
  numero: string
  meio: 'chat' | 'telefone' | ''
}

const PAISES = [
  { value: 'Brasil (+55)', label: 'Brasil (+55)' },
  { value: 'EUA (+1)', label: 'EUA (+1)' },
  { value: 'Portugal (+351)', label: 'Portugal (+351)' },
]

const EMPTY_FORM: Contato = {
  nome: '',
  cargo: '',
  telefones: [{ pais: 'Brasil (+55)', numero: '', meio: '' }],
  emails: [''],
  observacao: '',
}

export function AddContatoDialog({ open, onClose, onAdd, initialContato }: Props) {
  const [form, setForm] = useState<Contato>(EMPTY_FORM)

  useEffect(() => {
    if (open) setForm(initialContato ?? EMPTY_FORM)
  }, [open, initialContato])

  function setField<K extends keyof Contato>(field: K, value: Contato[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setTelefone(idx: number, field: keyof TelefoneEntry, value: string) {
    setForm(f => ({
      ...f,
      telefones: f.telefones.map((t, i) => i === idx ? { ...t, [field]: value } : t),
    }))
  }

  function addTelefone() {
    setForm(f => ({
      ...f,
      telefones: [...f.telefones, { pais: 'Brasil (+55)', numero: '', meio: '' }],
    }))
  }

  function setEmail(idx: number, value: string) {
    setForm(f => ({
      ...f,
      emails: f.emails.map((e, i) => i === idx ? value : e),
    }))
  }

  function addEmail() {
    setForm(f => ({ ...f, emails: [...f.emails, ''] }))
  }

  function handleAdd() {
    onAdd(form)
    setForm(EMPTY_FORM)
    onClose()
  }

  function handleClose() {
    setForm(EMPTY_FORM)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo contato"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleAdd}>Adicionar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">

        {/* Nome do contato — ~352px */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[#030712]">
            Nome do contato<span className="text-[#dc2626] ml-0.5">*</span>
          </label>
          <input
            type="text"
            className="h-9 w-[352px] rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Digite o nome do contato"
            value={form.nome}
            onChange={e => setField('nome', e.target.value)}
          />
        </div>

        {/* Cargo — ~352px */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[#030712]">
            Cargo<span className="text-[#dc2626] ml-0.5">*</span>
          </label>
          <input
            type="text"
            className="h-9 w-[352px] rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Digite o cargo"
            value={form.cargo}
            onChange={e => setField('cargo', e.target.value)}
          />
        </div>

        {/* Telefones */}
        <div className="flex flex-col gap-3">
          {form.telefones.map((tel, idx) => (
            <TelefoneRow
              key={idx}
              telefone={tel}
              isFirst={idx === 0}
              onChange={(field, val) => setTelefone(idx, field, val)}
              onAdd={idx === form.telefones.length - 1 ? addTelefone : undefined}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-[#e5e7eb]" />

        {/* Emails */}
        <div className="flex flex-col gap-3">
          {form.emails.map((email, idx) => (
            <EmailRow
              key={idx}
              email={email}
              isFirst={idx === 0}
              isLast={idx === form.emails.length - 1}
              onChange={val => setEmail(idx, val)}
              onAdd={idx === form.emails.length - 1 ? addEmail : undefined}
            />
          ))}
        </div>

        {/* Observação */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[#030712]">Observação</label>
          <textarea
            className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[64px]"
            placeholder="Anote aqui observações sobre esse contato"
            value={form.observacao}
            onChange={e => setField('observacao', e.target.value)}
          />
        </div>

      </div>
    </Modal>
  )
}

/* ─── Linha de telefone ─────────────────────────────────────────── */

interface TelefoneRowProps {
  telefone: TelefoneEntry
  isFirst: boolean
  onChange: (field: keyof TelefoneEntry, value: string) => void
  onAdd?: () => void
}

function RadioIcon({
  icon: Icon,
  selected,
  onClick,
}: {
  icon: typeof MessageCircle
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 p-1 rounded hover:bg-gray-50 transition-colors"
    >
      <div
        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
          selected ? 'border-blue-500 bg-white' : 'border-[#e5e7eb] bg-white'
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
      </div>
      <Icon className={`w-4 h-4 ${selected ? 'text-blue-500' : 'text-[#6b7280]'}`} />
    </button>
  )
}

function TelefoneRow({ telefone, isFirst, onChange, onAdd }: TelefoneRowProps) {
  return (
    <div className="flex items-end gap-2 w-full">

      {/* País / Região */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        {isFirst && (
          <label className="text-sm font-medium text-[#030712]">País / Região</label>
        )}
        <div className="relative">
          <select
            className="h-9 w-full appearance-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 pr-7"
            value={telefone.pais}
            onChange={e => onChange('pais', e.target.value)}
          >
            {PAISES.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] pointer-events-none" fill="none" viewBox="0 0 16 16">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Número */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        {isFirst && (
          <label className="text-sm font-medium text-[#030712]">Número</label>
        )}
        <input
          type="tel"
          className="h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="62 9 9679-7176"
          value={telefone.numero}
          onChange={e => onChange('numero', e.target.value)}
        />
      </div>

      {/* Usar este número como */}
      <div className="flex flex-col gap-3 shrink-0">
        {isFirst && (
          <label className="text-sm font-medium text-[#030712]">Usar este número como</label>
        )}
        <div className="flex items-center gap-1 h-9">
          <RadioIcon
            icon={MessageCircle}
            selected={telefone.meio === 'chat'}
            onClick={() => onChange('meio', telefone.meio === 'chat' ? '' : 'chat')}
          />
          <RadioIcon
            icon={Phone}
            selected={telefone.meio === 'telefone'}
            onClick={() => onChange('meio', telefone.meio === 'telefone' ? '' : 'telefone')}
          />
        </div>
      </div>

      {/* Botão + */}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="w-8 h-8 rounded-full border border-[#e5e7eb] bg-white flex items-center justify-center shrink-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4 text-[#030712]" />
        </button>
      )}

    </div>
  )
}

/* ─── Linha de email ─────────────────────────────────────────────── */

interface EmailRowProps {
  email: string
  isFirst: boolean
  isLast: boolean
  onChange: (value: string) => void
  onAdd?: () => void
}

function EmailRow({ email, isFirst, onChange, onAdd }: EmailRowProps) {
  return (
    <div className="flex items-end gap-2 w-full">
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        {isFirst && (
          <label className="text-sm font-medium text-[#030712]">Email</label>
        )}
        <input
          type="email"
          className="h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Digite seu email"
          value={email}
          onChange={e => onChange(e.target.value)}
        />
      </div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="w-8 h-8 rounded-full border border-[#e5e7eb] bg-white flex items-center justify-center shrink-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4 text-[#030712]" />
        </button>
      )}
    </div>
  )
}
