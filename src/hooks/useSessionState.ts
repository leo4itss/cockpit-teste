import { useState, useCallback } from 'react'

/**
 * useState que persiste o valor em sessionStorage.
 * Sobrevive à navegação entre rotas (desmonte/remonte do componente)
 * mas é limpo ao fechar o browser/aba.
 */
export function useSessionState<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setStateRaw] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key)
      return saved !== null ? (JSON.parse(saved) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setState = useCallback((valOrUpdater: T | ((prev: T) => T)) => {
    setStateRaw(prev => {
      const next = typeof valOrUpdater === 'function'
        ? (valOrUpdater as (prev: T) => T)(prev)
        : valOrUpdater
      try { sessionStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [key])

  return [state, setState]
}
