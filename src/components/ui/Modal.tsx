import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const MODAL_DURATION = 220

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-[640px]' }: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), MODAL_DURATION)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={[
          'fixed inset-0 bg-black/60 z-[150]',
          'transition-opacity duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-[151] flex items-center justify-center p-6 pointer-events-none">
        <div
          className={[
            'bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl',
            'shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]',
            `w-full ${maxWidth} pointer-events-auto`,
            'flex flex-col max-h-[90vh]',
            'transition-[opacity,transform] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          ].join(' ')}
          onClick={e => e.stopPropagation()}
        >
          {/* Header — fixo */}
          <div className="shrink-0 flex items-start justify-between px-6 pt-6 pb-0">
            <h2 className="text-lg font-semibold text-[#030712] leading-none">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-[#030712] opacity-70 hover:opacity-100 transition-opacity rounded p-0.5 -mt-0.5 -mr-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content — rola quando o conteúdo excede a altura disponível */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
            {children}
          </div>

          {/* Footer — fixo */}
          {footer && (
            <div className="shrink-0 flex items-center justify-end gap-2 px-6 pb-6 pt-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
