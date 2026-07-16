import { Sheet as PrizmSheet } from '@pas/ui'

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

export function Sheet({ open, onClose, title, description, children, footer, width = 'w-[768px]', headerAction }: SheetProps) {
  return (
    <PrizmSheet
      side="left"
      open={open}
      onOpenChange={(next) => { if (!next) onClose() }}
      title={
        headerAction ? (
          <div className="flex items-center justify-between w-full pr-8">
            <span>{title}</span>
            {headerAction}
          </div>
        ) : title
      }
      description={description}
      body={children}
      footer={footer}
      contentClassName={width}
    />
  )
}
