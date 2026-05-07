import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/api/client'
import { componentes as mockComponentes } from '@/data/mock'
import type { Componente } from '@/types'

interface ComponentesContextValue {
  componentes: Componente[]
  loading: boolean
  addComponente: (data: Omit<Componente, 'id' | 'createdAt'>) => Promise<void>
  updateComponente: (id: string, data: Partial<Componente>) => Promise<void>
  deleteComponente: (id: string) => Promise<'excluido' | 'inativado'>
  reativarComponente: (id: string) => Promise<void>
}

const ComponentesContext = createContext<ComponentesContextValue | null>(null)

export function ComponentesProvider({ children }: { children: ReactNode }) {
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getComponentes()
      .then(comps => {
        setComponentes(comps)
        setLoading(false)
      })
      .catch(() => {
        setComponentes(mockComponentes)
        setLoading(false)
      })
  }, [])

  const addComponente = useCallback(async (data: Omit<Componente, 'id' | 'createdAt'>) => {
    const local: Componente = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    try {
      const saved = await api.createComponente(local)
      setComponentes(prev => [...prev, saved])
    } catch {
      setComponentes(prev => [...prev, local])
    }
  }, [])

  const updateComponente = useCallback(async (id: string, data: Partial<Componente>) => {
    setComponentes(prev =>
      prev.map(c => c.id === id ? { ...c, ...data } : c)
    )
    try {
      const current = componentes.find(c => c.id === id)
      if (current) await api.updateComponente(id, { ...current, ...data })
    } catch {
      // already updated locally
    }
  }, [componentes])

  const deleteComponente = useCallback(async (id: string): Promise<'excluido' | 'inativado'> => {
    try {
      const result = await api.deleteComponente(id)
      if (result.action === 'inativado' && result.componente) {
        // Soft delete: atualiza status localmente
        setComponentes(prev => prev.map(c => c.id === id ? { ...c, status: 'Inativo' } : c))
      } else {
        // Hard delete: remove da lista
        setComponentes(prev => prev.filter(c => c.id !== id))
      }
      return result.action
    } catch {
      // Fallback offline: remove da lista
      setComponentes(prev => prev.filter(c => c.id !== id))
      return 'excluido'
    }
  }, [])

  const reativarComponente = useCallback(async (id: string) => {
    try {
      const updated = await api.reativarComponente(id)
      setComponentes(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
    } catch {
      setComponentes(prev => prev.map(c => c.id === id ? { ...c, status: 'Ativo' } : c))
    }
  }, [])

  return (
    <ComponentesContext.Provider value={{ componentes, loading, addComponente, updateComponente, deleteComponente, reativarComponente }}>
      {children}
    </ComponentesContext.Provider>
  )
}

export function useComponentes() {
  const ctx = useContext(ComponentesContext)
  if (!ctx) throw new Error('useComponentes must be used inside ComponentesProvider')
  return ctx
}
