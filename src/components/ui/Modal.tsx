import { Dialog as PrizmDialog } from '@pas/ui'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-[640px]' }: ModalProps) {
  return (
    <PrizmDialog
      open={open}
      onOpenChange={(next) => { if (!next) onClose() }}
      title={title}
      body={children}
      footer={footer}
      contentClassName={maxWidth}
    />
  )
}
