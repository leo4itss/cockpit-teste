import { useState, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

export interface ToastItem {
  id: string
  message: string
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
const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />,
  error:   <XCircle     className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />,
  warning: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />,
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className="bg-white border border-[#e5e7eb] rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-[400px]"
        >
          {ICONS[t.variant]}
          <span className="text-sm text-[#030712] flex-1 leading-5">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => { t.action!.onClick(); onDismiss(t.id) }}
              className="text-xs font-medium text-[#2563eb] shrink-0 hover:underline"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 text-[#9ca3af] hover:text-[#6b7280] transition-colors mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
