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
      <input
        id={inputId}
        className={cn(
          'h-9 w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#030712] placeholder:text-[#6b7280] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-[#6b7280]',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
