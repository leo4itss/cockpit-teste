import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 z-[100]" onClick={onClose} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
        <div className={`bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto ${className ?? ''}`}>
          <div className="flex items-start justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-[#030712]">{title}</h2>
              {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6">{children}</div>
          {footer && (
            <div className="border-t border-gray-200 p-4 flex justify-end gap-2">{footer}</div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
