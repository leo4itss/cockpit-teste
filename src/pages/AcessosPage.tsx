import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Search, Plus, Ellipsis, BadgeCheck, Circle, FilePen, UserX, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import { NewUserSheet } from '@/components/NewUserSheet'
import { UserDetailSheet } from '@/components/UserDetailSheet'
import { EditUserSheet } from '@/components/EditUserSheet'
import { api } from '@/api/client'
import type { User, Grupo } from '@/types'

export function AcessosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewUserSheet, setShowNewUserSheet] = useState(false)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  useEffect(() => {
    api.getUsers().then(data => {
      setUsers(data)
      setLoading(false)
    })
  }, [])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return users.filter(user =>
      user.nomeCompleto.toLowerCase().includes(query) ||
      user.usuario.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  async function handleCreateUser(newUser: Omit<User, 'id'>) {
    const user = await api.createUser({ ...newUser, id: crypto.randomUUID() })
    setUsers(prev => [...prev, user])
    setShowNewUserSheet(false)
  }

  function handleViewUser(user: User) {
    setSelectedUser(user)
    setShowDetailSheet(true)
  }

  const pendingEditUser = useRef<User | null>(null)

  const handleEditUser = useCallback((user: User) => {
    pendingEditUser.current = user
    setShowDetailSheet(false)
    setTimeout(() => {
      setSelectedUser(pendingEditUser.current)
      setShowEditSheet(true)
      pendingEditUser.current = null
    }, 340)
  }, [])

  async function handleSaveEditUser(updatedUser: User) {
    const saved = await api.updateUser(updatedUser.id, updatedUser)
    setUsers(prev => prev.map(u => u.id === saved.id ? saved : u))
    setShowEditSheet(false)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between px-8 py-4">
        <h1 className="text-2xl font-bold leading-8 text-[#030712]">Acessos e usuários</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
            <Search className="w-4 h-4 text-gray-400 opacity-50" />
            <input
              type="text"
              placeholder="Buscar"
              className="w-28 bg-transparent text-sm outline-none text-[#030712] placeholder:text-[#6b7280]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            )}
          </div>
          <Button onClick={() => setShowNewUserSheet(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo usuário
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="px-8 pt-6 pb-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[200px]">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[150px]">Usuário</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[200px]">E-mail</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[150px]">Função</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 min-w-[120px]">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 opacity-40 min-w-[120px]">Último acesso</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 opacity-40 w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Carregando...</td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewUser(user)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                        <span className="text-sm font-medium text-[#030712] truncate">{user.nomeCompleto}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#030712]">{user.usuario}</td>
                    <td className="px-4 py-3 text-sm text-[#030712]">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-[#030712]">{user.papel}</td>
                    <td className="px-4 py-3 text-center">
                      {user.status === 'Ativo' ? (
                        <span className="inline-flex items-center gap-1 bg-green-200 text-green-700 text-xs font-semibold rounded-[2px] px-2 py-1">
                          <BadgeCheck className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-[2px] px-2 py-1">
                          <Circle className="w-3 h-3" />
                          {user.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#030712]">{user.ultimoAcesso}</td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <Popover
                        content={
                          <div className="flex flex-col gap-1 min-w-[163px]">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left"
                            >
                              <FilePen className="w-4 h-4 shrink-0" />
                              Editar usuário
                            </button>
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left"
                            >
                              <UserX className="w-4 h-4 shrink-0" />
                              Inativar usuário
                            </button>
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-[#030712] hover:bg-gray-100 rounded-md transition-colors text-left"
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              Criar Contrato
                            </button>
                          </div>
                        }
                      >
                        <button
                          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                          title="Ações"
                        >
                          <Ellipsis className="w-4 h-4 text-gray-600" />
                        </button>
                      </Popover>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewUserSheet
        open={showNewUserSheet}
        onClose={() => setShowNewUserSheet(false)}
        onSave={handleCreateUser}
      />
      <UserDetailSheet
        open={showDetailSheet}
        onClose={() => setShowDetailSheet(false)}
        user={selectedUser}
        onEdit={handleEditUser}
      />
      <EditUserSheet
        open={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        user={selectedUser}
        onSave={handleSaveEditUser}
      />
    </div>
  )
}
