import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default' | 'secondary'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[2px] px-2 py-1 text-xs font-semibold',
        {
          'bg-green-200 text-green-700': variant === 'success',
          'bg-yellow-50 text-yellow-700 border border-yellow-200': variant === 'warning',
          'bg-red-50 text-red-700 border border-red-200': variant === 'error',
          'bg-blue-50 text-blue-700 border border-blue-200': variant === 'info',
          'bg-gray-100 text-gray-700': variant === 'default',
          'bg-gray-100 text-gray-500': variant === 'secondary',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
