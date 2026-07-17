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
      // @pas/ui aplica "sm:max-w-sm" por padrão nos lados left/right — sem
      // sobrescrever o mesmo breakpoint, o limite de largura vence e o
      // painel fica travado em ~384px independente do "width" pedido aqui.
      contentClassName={`${width} ${width.replace(/^w-/, 'sm:max-w-')}`}
    />
  )
}
