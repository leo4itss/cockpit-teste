import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'figma-capture-session'

function hasCaptureHash(hash: string) {
  return hash.includes('figmacapture=')
}

/** Mantém os parâmetros #figmacapture na URL ao navegar pelo SPA (React Router remove o hash). */
export function FigmaCaptureSession() {
  const location = useLocation()

  useEffect(() => {
    if (hasCaptureHash(location.hash)) {
      sessionStorage.setItem(STORAGE_KEY, location.hash.slice(1))
      return
    }

    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (!saved || hasCaptureHash(location.hash)) return

    const next = `${location.pathname}${location.search}#${saved}`
    window.history.replaceState(null, '', next)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    const onHashChange = () => {
      if (hasCaptureHash(window.location.hash)) {
        sessionStorage.setItem(STORAGE_KEY, window.location.hash.slice(1))
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return null
}
