import { Copy } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-[#e5e7eb] rounded-2xl p-6', className)}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="text-base font-bold text-[#030712] leading-6">{children}</p>
}

export function Divider() {
  return <div className="border-t border-[#e5e7eb]" />
}

export function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#030712]">{label}</label>
      <div className="h-9 w-full rounded-md bg-[#f3f4f6] px-3 flex items-center">
        <span className={cn('text-sm text-[#6b7280] truncate', mono && 'font-mono')}>{value || '—'}</span>
      </div>
    </div>
  )
}

export function CopyButton({ text, onCopy }: { text: string; onCopy?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); onCopy?.() }}
      className="text-[#6b7280] hover:text-[#030712] transition-colors shrink-0"
      title="Copiar"
    >
      <Copy className="w-4 h-4" />
    </button>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-center">
      <p className="text-sm font-medium text-[#030712]">{title}</p>
      {description && <p className="text-xs text-[#6b7280] max-w-sm">{description}</p>}
    </div>
  )
}
