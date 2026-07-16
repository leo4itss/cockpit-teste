import { Button as PrizmButton } from '@pas/ui'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = { sm: 'sm', md: 'default', lg: 'lg' } as const

export function Button({ variant = 'primary', size = 'md', className, children, type, ...props }: ButtonProps) {
  return (
    <PrizmButton
      variant={variant}
      size={SIZE_MAP[size]}
      className={className}
      type={type ?? 'button'}
      {...props}
    >
      {children}
    </PrizmButton>
  )
}
