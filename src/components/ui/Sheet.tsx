import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: string
  headerAction?: React.ReactNode
}

const DURATION = 320

export function Sheet({ open, onClose, title, description, children, footer, width = 'w-[768px]', headerAction }: SheetProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      // flushSync força o React a commitar setMounted(true) de forma síncrona,
      // garantindo que o browser pinte o estado inicial (-translate-x-full)
      // antes do rAF disparar a transição de entrada.
      // Sem isso, React 18 pode batchar os dois setState no mesmo frame
      // e a transition não executa.
      flushSync(() => setMounted(true))
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), DURATION)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    document.body.style.overflow = mounted ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mounted])

  if (!mounted) return null

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40',
          'transition-opacity duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Painel — entra da esquerda */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full bg-white shadow-xl z-50 flex flex-col',
          'transition-transform duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          visible ? 'translate-x-0' : '-translate-x-full',
          width
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-[#e5e7eb] shrink-0">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-[#030712] leading-8">{title}</h2>
            {description && (
              <p className="text-sm text-[#6b7280] leading-5">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            {headerAction}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-[#e5e7eb] px-5 py-6 flex items-center justify-end gap-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
