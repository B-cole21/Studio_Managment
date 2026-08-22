import { useId } from 'react'
import type { ReactNode } from 'react'

export interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'right'
  className?: string
}

export function Tooltip({ label, children, side = 'top', className = '' }: TooltipProps) {
  const id = useId()
  const position =
    side === 'right'
      ? 'left-full ml-1.5'
      : side === 'bottom'
        ? 'top-full mt-1.5'
        : 'bottom-full mb-1.5'
  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border-strong bg-surface-overlay px-2 py-1 text-xs font-medium text-text-primary opacity-0 shadow-1 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
          side === 'right' ? 'top-1/2 -translate-y-1/2' : 'left-1/2 -translate-x-1/2'
        } ${position}`}
      >
        {label}
      </span>
    </span>
  )
}
