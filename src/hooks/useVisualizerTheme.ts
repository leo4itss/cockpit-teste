import { useState } from 'react'
import { DARK_THEME, LIGHT_THEME, type ThemeMode, type VisualizerTheme } from '@/lib/visualizerTheme'

const STORAGE_KEY = 'cockpit-viz-theme'

export function useVisualizerTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      return saved === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })

  const theme: VisualizerTheme = mode === 'light' ? LIGHT_THEME : DARK_THEME

  function toggle() {
    setMode(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
      return next
    })
  }

  return { theme, mode, toggle }
}
