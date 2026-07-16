import { Input as PrizmInput } from '@pas/ui'
import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  required?: boolean
  error?: string
}

export function Input({ label, required, error, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-3">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#030712]">
          {label}{required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
      )}
      <PrizmInput
        id={inputId}
        className={cn(error && 'border-destructive', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
