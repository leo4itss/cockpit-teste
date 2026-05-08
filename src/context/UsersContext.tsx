import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/api/client'
import { users as mockUsers } from '@/data/mock'
import type { User } from '@/types'

interface UsersContextValue {
  users: User[]
  loading: boolean
  /** Opções { value, label } para o Select de Arquiteto PAS (filtrado por cargo) */
  arquitetoOptions: { value: string; label: string }[]
}

const UsersContext = createContext<UsersContextValue | null>(null)

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getUsers()
      .then(data => {
        setUsers(data)
        setLoading(false)
      })
      .catch(() => {
        setUsers(mockUsers)
        setLoading(false)
      })
  }, [])

  const arquitetoOptions = users
    .filter(u => u.status === 'Ativo' && u.cargo === 'Arquiteto PAS')
    .map(u => ({ value: u.nomeCompleto, label: u.nomeCompleto }))

  return (
    <UsersContext.Provider value={{ users, loading, arquitetoOptions }}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) throw new Error('useUsers must be used inside UsersProvider')
  return ctx
}
