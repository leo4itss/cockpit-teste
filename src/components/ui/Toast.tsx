import { useState, useCallback } from 'react'

export interface ToastItem {
  id: string
  message: string          // suporta '\n' para separar título e subtítulo
  variant: 'success' | 'error' | 'warning'
  action?: { label: string; onClick: () => void }
}

/* ── useToast hook ─────────────────────────────────────────── */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback(
    (
      message: string,
      variant: ToastItem['variant'] = 'success',
      action?: ToastItem['action'],
    ) => {
      const id = crypto.randomUUID()
      const duration = variant === 'warning' ? 5000 : 4000
      setToasts(prev => [...prev, { id, message, variant, action }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    },
    [],
  )

  return { toasts, toast, dismiss }
}

/* ── ToastContainer ────────────────────────────────────────── */

export function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
  position?: 'top-right' | 'bottom-right'
}) {
  if (toasts.length === 0) return null

  const positionClasses = position === 'top-right'
    ? 'top-20 right-6 flex-col-reverse items-end'
    : 'bottom-6 right-6 flex-col'

  return (
    <div className={`fixed z-[200] flex gap-2 ${positionClasses}`}>
      {toasts.map(t => {
        // Suporta '\n' para separar título e subtítulo
        const parts = t.message.split('\n')
        const title = parts[0]
        const subtitle = parts.slice(1).join('\n') || undefined

        const actionLabel = t.action?.label ?? 'Ok'
        const handleAction = () => {
          t.action?.onClick()
          onDismiss(t.id)
        }

        return (
          <div
            key={t.id}
            className="bg-white border border-[#e5e7eb] rounded-lg shadow-[0px_4px_6px_rgba(0,0,0,0.1)] px-4 py-4 flex items-center gap-2 min-w-[280px] max-w-[420px]"
          >
            {/* Texto */}
            <div className="flex flex-col gap-[2px] flex-1 min-w-0">
              <p className="text-sm font-medium text-[#030712] leading-5">{title}</p>
              {subtitle && (
                <p className="text-sm font-normal text-[#6b7280] leading-5">{subtitle}</p>
              )}
            </div>

            {/* Botão ação (Ok ou Desfazer) */}
            <button
              type="button"
              onClick={handleAction}
              className="shrink-0 h-6 px-2 bg-[#2563eb] text-[#f9fafb] text-xs font-medium rounded leading-none shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#1d4ed8] transition-colors"
            >
              {actionLabel}
            </button>
          </div>
        )
      })}
    </div>
  )
}
