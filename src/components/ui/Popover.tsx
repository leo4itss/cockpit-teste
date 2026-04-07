import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PopoverProps {
  children: ReactNode
  content: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Popover({ children, content, open, onOpenChange }: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        {children}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        className={cn(
          'bg-white border border-gray-200 rounded-md p-4 shadow-[0_4px_6px_0_rgba(0,0,0,0.1),0_2px_4px_0_rgba(0,0,0,0.1)] z-50',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
        )}
        side="bottom"
        align="end"
        sideOffset={8}
      >
        {content}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}
