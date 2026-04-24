import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { api } from '@/api/client'
import type { Grupo, User } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Grupo, 'id' | 'createdAt' | 'qtdMembros'> & { membroIds: string[] }) => void
}

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
]

function SectionLegend({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-3">
      <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
    </div>
  )
}

function Separator() {
  return <div className="border-t border-gray-200 w-full" />
}

export function NewGrupoSheet({ open, onClose, onSave }: Props) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [membroIds, setMembroIds] = useState<string[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.getUsers().then(setUsuarios)
    }
  }, [open])

  function resetForm() {
    setNome('')
    setDescricao('')
    setStatus('Ativo')
    setMembroIds([])
    setUserSearch('')
    setSaving(false)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSave() {
    if (!nome.trim()) return
    setSaving(true)
    await onSave({ nome: nome.trim(), descricao: descricao.trim() || undefined, status, membroIds })
    resetForm()
  }

  function toggleMembro(userId: string) {
    setMembroIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const filteredUsers = usuarios.filter(u =>
    u.nomeCompleto.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <Sheet open={open} onClose={handleClose} title="Novo grupo">
      <div className="flex flex-col gap-6 py-6 px-6">

        {/* Informações do grupo */}
        <div className="flex flex-col gap-4">
          <SectionLegend>Informações do grupo</SectionLegend>
          <Input
            label="Nome do grupo"
            required
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Administradores, Suporte, Comercial"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#030712]">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva a finalidade deste grupo"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-gray-300 resize-none placeholder:text-gray-400"
            />
          </div>
          <Select
            label="Status"
            value={status}
            onChange={v => setStatus(v as 'Ativo' | 'Inativo')}
            options={STATUS_OPTIONS}
          />
        </div>

        <Separator />

        {/* Membros */}
        <div className="flex flex-col gap-4">
          <SectionLegend>Membros</SectionLegend>
          <p className="text-sm text-gray-500 -mt-2">Selecione os usuários que farão parte deste grupo.</p>

          {/* Busca de usuários */}
          <input
            type="text"
            placeholder="Buscar usuário..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-400"
          />

          {/* Lista de usuários */}
          <div className="flex flex-col gap-1 max-h-56 overflow-y-auto border border-gray-200 rounded-md">
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400 text-center">Nenhum usuário encontrado</p>
            ) : (
              filteredUsers.map(user => {
                const selected = membroIds.includes(user.id)
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleMembro(user.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 ${selected ? 'bg-gray-50' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${selected ? 'bg-[#030712] border-[#030712]' : 'border-gray-300'}`}>
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</span>
                      <span className="text-xs text-gray-500 truncate">{user.email}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {membroIds.length > 0 && (
            <p className="text-xs text-gray-500">{membroIds.length} usuário{membroIds.length > 1 ? 's' : ''} selecionado{membroIds.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 shrink-0">
        <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || !nome.trim()}>
          {saving ? 'Salvando...' : 'Criar grupo'}
        </Button>
      </div>
    </Sheet>
  )
}
