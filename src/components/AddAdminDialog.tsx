import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (admin: AdminUser) => void
}

export interface AdminUser {
  email: string
  nome: string
  senha: string
}

function PasswordInput({
  label,
  required,
  placeholder,
  value,
  onChange,
}: {
  label: string
  required?: boolean
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  const inputId = label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-sm font-medium text-[#030712]">
        {label}
        {required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          className="h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 pr-9 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#030712] transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

export function AddAdminDialog({ open, onClose, onAdd }: Props) {
  const [form, setForm] = useState<AdminUser & { confirmar: string }>({
    email: '',
    nome: '',
    senha: '',
    confirmar: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleAdd() {
    onAdd({ email: form.email, nome: form.nome, senha: form.senha })
    setForm({ email: '', nome: '', senha: '', confirmar: '' })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo usuário administrador"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAdd}>Adicionar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">

        {/* E-mail */}
        <div className="flex flex-col gap-3">
          <label htmlFor="admin-email" className="text-sm font-medium text-[#030712]">
            E-mail<span className="text-[#dc2626] ml-0.5">*</span>
          </label>
          <input
            id="admin-email"
            type="email"
            className="h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="usuario@exemplo.com.br"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>

        {/* Nome */}
        <div className="flex flex-col gap-3">
          <label htmlFor="admin-nome" className="text-sm font-medium text-[#030712]">
            Nome<span className="text-[#dc2626] ml-0.5">*</span>
          </label>
          <input
            id="admin-nome"
            type="text"
            className="h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nome completo"
            value={form.nome}
            onChange={e => set('nome', e.target.value)}
          />
        </div>

        {/* Senha */}
        <PasswordInput
          label="Senha"
          required
          placeholder="6+caracteres"
          value={form.senha}
          onChange={v => set('senha', v)}
        />

        {/* Confirme a Senha */}
        <PasswordInput
          label="Confirme a Senha"
          required
          placeholder="Digite sua senha"
          value={form.confirmar}
          onChange={v => set('confirmar', v)}
        />

      </div>
    </Modal>
  )
}
