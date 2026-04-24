import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { VincularMembroDialog } from './VincularMembroDialog'
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

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function NewGrupoSheet({ open, onClose, onSave }: Props) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [membroIds, setMembroIds] = useState<string[]>([])
  const [membrosCarregados, setMembrosCarregados] = useState<User[]>([])
  const [showVincularDialog, setShowVincularDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setNome('')
      setDescricao('')
      setStatus('Ativo')
      setMembroIds([])
      setMembrosCarregados([])
      setSaving(false)
    }
  }, [open])

  function handleClose() {
    onClose()
  }

  async function handleSave() {
    if (!nome.trim()) return
    setSaving(true)
    await onSave({ nome: nome.trim(), descricao: descricao.trim() || undefined, status, membroIds })
    setSaving(false)
  }

  async function handleVincular(ids: string[]) {
    // Load user details for display
    const users = await api.getUsers()
    const novos = users.filter((u: User) => ids.includes(u.id) && !membroIds.includes(u.id))
    setMembroIds(prev => [...prev, ...ids.filter(id => !prev.includes(id))])
    setMembrosCarregados(prev => [...prev, ...novos])
  }

  function removerMembro(id: string) {
    setMembroIds(prev => prev.filter(x => x !== id))
    setMembrosCarregados(prev => prev.filter(u => u.id !== id))
  }

  return (
    <>
      <Sheet open={open} onClose={handleClose} title="Novo Grupo">
        <div className="flex flex-col gap-8 py-6 px-6 flex-1 overflow-y-auto">

          {/* Avatar */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-sm text-gray-400 font-medium">
              {nome ? initials(nome) : '?'}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-gray-500">Foto de perfil. Formato: 512×512 pixels.</p>
              <Button variant="outline" size="sm" type="button">
                Escolher imagem
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* Informações básicas */}
          <div className="flex flex-col gap-4">
            <p className="text-base font-bold text-[#030712]">Informações básicas</p>
            <div className="flex flex-col gap-4">
              <Input
                label="Nome do grupo"
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Escreva o nome do grupo"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#030712]">Descrição</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Descreva a finalidade deste grupo"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-gray-300 placeholder:text-gray-400 h-9"
                />
              </div>
              <Select
                label="Status"
                value={status}
                onChange={e => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                options={STATUS_OPTIONS}
              />
            </div>
          </div>

          {/* Membros */}
          <div className="flex flex-col gap-4">
            <p className="text-base font-bold text-[#030712]">Membros</p>
            <p className="text-sm text-gray-500 -mt-2">
              Ao vincular um membro, o usuário herda permissões atribuídas via membros.
            </p>

            {/* Row com label + botão */}
            <div className="border border-gray-200 rounded-md px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[#030712]">Membros</span>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowVincularDialog(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar
              </Button>
            </div>

            {/* Lista de membros selecionados */}
            {membrosCarregados.length > 0 && (
              <div className="flex flex-col gap-1">
                {membrosCarregados.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-[#030712] shrink-0">
                        {initials(u.nomeCompleto)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#030712]">{u.nomeCompleto}</span>
                        <span className="text-xs text-gray-400">{u.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removerMembro(u.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !nome.trim()}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </Sheet>

      <VincularMembroDialog
        open={showVincularDialog}
        onClose={() => setShowVincularDialog(false)}
        onVincular={handleVincular}
        membroIdsAtuais={membroIds}
      />
    </>
  )
}
