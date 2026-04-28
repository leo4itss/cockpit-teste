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
  nome: string
  sobrenome: string
  email: string
  usuario: string
  senha: string
}

/* ── sub-components ────────────────────────────────────── */

function Field({
  id,
  label,
  required,
  type = 'text',
  placeholder,
  value,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-medium text-[#030712]">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        className="h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function PasswordField({
  id,
  label,
  required,
  placeholder,
  value,
  onChange,
}: {
  id: string
  label: string
  required?: boolean
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-medium text-[#030712]">
        {label}{required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
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
          aria-label={show ? 'Ocultar' : 'Mostrar'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

/* ── main ─────────────────────────────────────────────────── */

const EMPTY = { nome: '', sobrenome: '', email: '', usuario: '', senha: '', confirmar: '' }

export function AddAdminDialog({ open, onClose, onAdd }: Props) {
  const [form, setForm] = useState(EMPTY)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleClose() {
    setForm(EMPTY)
    onClose()
  }

  function handleAdd() {
    onAdd({ nome: form.nome, sobrenome: form.sobrenome, email: form.email, usuario: form.usuario, senha: form.senha })
    setForm(EMPTY)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo usuário administrador"
      maxWidth="max-w-[600px]"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleAdd}>Adicionar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">

        {/* Nome + Sobrenome */}
        <div className="grid grid-cols-2 gap-7">
          <Field
            id="admin-nome"
            label="Nome"
            required
            placeholder="Digite o nome"
            value={form.nome}
            onChange={v => set('nome', v)}
          />
          <Field
            id="admin-sobrenome"
            label="Sobrenome"
            required
            placeholder="Digite o sobrenome"
            value={form.sobrenome}
            onChange={v => set('sobrenome', v)}
          />
        </div>

        {/* E-mail */}
        <Field
          id="admin-email"
          label="E-mail"
          required
          type="email"
          placeholder="Digite o e-mail"
          value={form.email}
          onChange={v => set('email', v)}
        />

        {/* Usuário/Login */}
        <PasswordField
          id="admin-usuario"
          label="Usuário/Login"
          required
          placeholder="Digite o nome do usuário"
          value={form.usuario}
          onChange={v => set('usuario', v)}
        />

        {/* Senha */}
        <PasswordField
          id="admin-senha"
          label="Senha"
          required
          placeholder="Digite a senha"
          value={form.senha}
          onChange={v => set('senha', v)}
        />

        {/* Confirme a Senha */}
        <PasswordField
          id="admin-confirmar"
          label="Confirme a Senha"
          required
          placeholder="Confirme sua senha"
          value={form.confirmar}
          onChange={v => set('confirmar', v)}
        />

      </div>
    </Modal>
  )
}
