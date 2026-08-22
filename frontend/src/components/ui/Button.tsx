import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap ' +
  'transition-colors duration-150 select-none disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent shadow-[0_1px_2px_rgba(0,0,0,.2)]',
  secondary:
    'bg-surface-2 text-text-primary border border-border-strong hover:bg-surface-3 active:bg-surface-3',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-3',
  destructive:
    'bg-danger-soft text-danger hover:bg-danger hover:text-white',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'solid' | 'secondary'
  size?: 'sm' | 'md'
  label: string
  icon: ReactNode
}

const iconBtnVariants: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-3',
  solid: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary:
    'bg-surface-2 text-text-primary border border-border-strong hover:bg-surface-3',
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  label,
  icon,
  className = '',
  ...rest
}: IconButtonProps) {
  const dims = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-md transition-colors duration-150 ${dims} ${iconBtnVariants[variant]} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  )
}
