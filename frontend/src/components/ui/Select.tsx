import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  hint?: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  options: SelectOption[]
  hint?: string
  error?: string
  placeholder?: string
}

export function Select({
  label,
  options,
  hint,
  error,
  placeholder,
  className = '',
  id,
  value,
  defaultValue,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const selected = value ?? defaultValue
  const placeholderShown = placeholder && (selected === undefined || selected === '')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`w-full h-9 appearance-none rounded-md bg-surface-2 border border-border-strong pl-3 pr-9 text-sm text-text-primary transition-colors duration-150 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:opacity-50 ${placeholderShown ? 'text-text-muted' : ''} ${error ? 'border-danger' : ''} ${className}`}
          aria-invalid={error ? true : undefined}
          {...rest}
        >
          {placeholder && <option value="" disabled className="bg-[#1e232d] text-gray-400">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-[#1e232d] text-white py-1">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </div>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
