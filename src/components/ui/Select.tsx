import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  required?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, required, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-3">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-[#030712]">
          {label}{required && <span className="text-red-600 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'h-9 w-full appearance-none rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-sm text-[#030712] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}
