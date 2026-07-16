import { toast as prizmToast, Toaster } from '@pas/ui'

export type ToastVariant = 'success' | 'error' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

/* ── useToast hook ─────────────────────────────────────────── */
export function useToast() {
  const toast = (
    message: string,          // suporta '\n' para separar título e subtítulo
    variant: ToastVariant = 'success',
    action?: ToastAction,
  ) => {
    const [title, ...rest] = message.split('\n')
    const description = rest.join('\n') || undefined

    prizmToast[variant](title, {
      description,
      action: { label: action?.label ?? 'Ok', onClick: () => action?.onClick() },
    })
  }

  return { toast }
}

export { Toaster }
