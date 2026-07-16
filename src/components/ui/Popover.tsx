import { Popover as PrizmPopover } from '@pas/ui'
import type { ReactNode } from 'react'

interface PopoverProps {
  children: ReactNode
  content: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Popover({ children, content, open, onOpenChange }: PopoverProps) {
  return (
    <PrizmPopover
      trigger={children}
      content={content}
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      align="end"
      sideOffset={8}
    />
  )
}
