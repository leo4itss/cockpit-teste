import { Select as PrizmSelect } from '@pas/ui'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  required?: boolean
  options: SelectOption[]
  placeholder?: string
  value?: string
  onChange?: (value: string | undefined) => void
  disabled?: boolean
  className?: string
}

export function Select({ label, required, options, placeholder, className, value, onChange, disabled }: SelectProps) {
  return (
    <div className="flex flex-col gap-3">
      {label && (
        <span className="text-sm font-medium text-[#030712]">
          {label}{required && <span className="text-red-600 ml-0.5">*</span>}
        </span>
      )}
      <PrizmSelect
        options={options}
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  )
}
