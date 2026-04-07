import { useState } from 'react'
import { Plus, MessageCircle, Phone } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Input } from './ui/Input'
import { Button } from './ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (contato: Contato) => void
}

export interface Contato {
  nome: string
  cargo: string
  telefones: TelefoneEntry[]
  email: string
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

export function AddContatoDialog({ open, onClose, onAdd }: Props) {
  const [form, setForm] = useState<Contato>({
    nome: '',
    cargo: '',
    telefones: [{ pais: 'Brasil (+55)', numero: '', meio: '' }],
    email: '',
    observacao: '',
  })

  function setField(field: keyof Contato, value: string) {
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

  function handleAdd() {
    onAdd(form)
    setForm({
      nome: '', cargo: '',
      telefones: [{ pais: 'Brasil (+55)', numero: '', meio: '' }],
      email: '', observacao: '',
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo contato"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAdd}>Adicionar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">

        {/* Nome — 352px (não full width, conforme design) */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[#030712]">
            Nome<span className="text-[#dc2626] ml-0.5">*</span>
          </label>
          <input
            type="text"
            className="h-9 w-[352px] rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Digite o nome do contato"
            value={form.nome}
            onChange={e => setField('nome', e.target.value)}
          />
        </div>

        {/* Cargo — 352px */}
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

        {/* Telefones — full width */}
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

        {/* Email — full width */}
        <Input
          label="Email"
          placeholder="marcelo.gomes@grupoitss.com.br"
          value={form.email}
          onChange={e => setField('email', e.target.value)}
        />

        {/* Observação — full width, ~96px */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-[#030712]">Observação</label>
          <textarea
            className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            style={{ height: '80px' }}
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
      className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 transition-colors"
    >
      {/* Radio circle */}
      <div
        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
          selected
            ? 'border-blue-500 bg-white'
            : 'border-[#e5e7eb] bg-white'
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
      </div>
      {/* Ícone */}
      <Icon className={`w-4 h-4 ${selected ? 'text-blue-500' : 'text-[#6b7280]'}`} />
    </button>
  )
}

function TelefoneRow({ telefone, isFirst, onChange, onAdd }: TelefoneRowProps) {
  return (
    <div className="flex items-end gap-2 w-full">

      {/* País / Região — flex-1 (~187px) */}
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

      {/* Número — flex-1 (~187px) */}
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

      {/* Meio de contato — ~162px fixo */}
      <div className="flex flex-col gap-3 shrink-0">
        {isFirst && (
          <label className="text-sm font-medium text-[#030712]">Meio de contato</label>
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

      {/* Botão + — 32px, circle outline */}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="w-8 h-8 rounded-full border border-[#e5e7eb] bg-white flex items-center justify-center shrink-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:bg-gray-50 transition-colors mb-0.5"
        >
          <Plus className="w-4 h-4 text-[#030712]" />
        </button>
      )}

    </div>
  )
}
