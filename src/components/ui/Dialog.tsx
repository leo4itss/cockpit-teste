import { Dialog as PrizmDialog } from '@pas/ui'

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
  return (
    <PrizmDialog
      open={open}
      onOpenChange={(next) => { if (!next) onClose() }}
      title={title}
      description={description}
      body={children}
      footer={footer}
      contentClassName={className}
    />
  )
}
