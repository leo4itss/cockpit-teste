import { useState, useMemo, useEffect } from 'react'
import { Search, X, Check } from 'lucide-react'
import { Button } from './ui/Button'
import { api } from '@/api/client'
import type { User } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onVincular: (userIds: string[]) => void
  membroIdsAtuais?: string[]
}

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function VincularMembroDialog({ open, onClose, onVincular, membroIdsAtuais = [] }: Props) {
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelecionados([])
    setSearch('')
    setLoading(true)
    api.getUsers()
      .then(data => setUsuarios(data.filter((u: User) => !membroIdsAtuais.includes(u.id))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, membroIdsAtuais])

  const filtrados = useMemo(() => {
    const q = search.toLowerCase()
    return usuarios.filter(u =>
      u.nomeCompleto.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.cargo.toLowerCase().includes(q)
    )
  }, [usuarios, search])

  function toggleUser(id: string) {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleVincular() {
    if (selecionados.length === 0) return
    setSaving(true)
    await onVincular(selecionados)
    setSaving(false)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 flex flex-col gap-6 p-6 max-h-[85vh]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded text-gray-400 hover:text-gray-600 opacity-70"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <p className="text-lg font-semibold text-[#030712]">Usuários</p>

        {/* Subheader */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <p className="text-base font-medium text-[#030712]">
            {selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md">
            <Search className="w-4 h-4 text-gray-400 opacity-50" />
            <input
              type="text"
              placeholder="Buscar"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm outline-none bg-transparent text-[#030712] placeholder:text-[#6b7280] w-28"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto min-h-0">
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="w-[52px] px-3 py-2.5" />
                  <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[180px]">Nome</th>
                  <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[120px]">Cargo</th>
                  <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[180px]">E-mail</th>
                  <th className="px-3 py-2.5 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[120px]">Área</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum usuário disponível</td></tr>
                ) : (
                  filtrados.map(user => {
                    const selected = selecionados.includes(user.id)
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-gray-200 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleUser(user.id)}
                      >
                        <td className="px-3 py-3 text-center">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center mx-auto transition-colors ${selected ? 'bg-[#030712] border-[#030712]' : 'border-gray-300 bg-white'}`}>
                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-[#030712] shrink-0">
                              {initials(user.nomeCompleto)}
                            </div>
                            <span className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 truncate">{user.cargo}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 truncate">{user.email}</td>
                        <td className="px-3 py-3 text-sm text-gray-600 truncate">{user.area}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleVincular} disabled={saving || selecionados.length === 0}>
            {saving ? 'Vinculando...' : 'Vincular'}
          </Button>
        </div>
      </div>
    </div>
  )
}
