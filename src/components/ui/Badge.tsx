import { Badge as PrizmBadge } from '@pas/ui'
import { BadgeCheck, CircleMinus } from 'lucide-react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'secondary'
  showIcon?: boolean   // exibe ícone 12×12 antes do texto (BadgeCheck para success, CircleMinus para secondary)
  className?: string
}

const VARIANT_MAP = {
  success: 'success',
  warning: 'warning',
  error: 'destructive',
  info: 'info',
  default: 'default',
  secondary: 'secondary',
} as const

export function Badge({ children, variant = 'default', showIcon = false, className }: BadgeProps) {
  const Icon = variant === 'secondary' ? CircleMinus : BadgeCheck
  return (
    <PrizmBadge
      variant={VARIANT_MAP[variant]}
      className={className}
      startIcon={showIcon ? <Icon className="w-3 h-3 shrink-0" /> : undefined}
    >
      {children}
    </PrizmBadge>
  )
}
