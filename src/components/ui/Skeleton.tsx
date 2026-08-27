import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('inline-block bg-gray-100 rounded animate-pulse', className)} />
}
