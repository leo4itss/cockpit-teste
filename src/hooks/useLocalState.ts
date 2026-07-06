import { useState, useCallback } from 'react'

/**
 * useState que persiste o valor em localStorage.
 * Diferente de useSessionState, sobrevive ao fechamento do browser —
 * usado para preferências do usuário (ex.: colunas visíveis de uma tabela).
 */
export function useLocalState<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setStateRaw] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
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
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [key])

  return [state, setState]
}
