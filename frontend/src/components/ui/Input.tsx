import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

const inputBase =
  'w-full h-9 rounded-md bg-surface-2 border border-border-strong px-3 text-sm ' +
  'text-text-primary placeholder:text-text-muted transition-colors duration-150 ' +
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  rightAction?: ReactNode
}

export function Input({ label, hint, error, icon, rightAction, className = '', id, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`${inputBase} ${icon ? 'pl-9' : ''} ${rightAction ? 'pr-9' : ''} ${error ? 'border-danger focus:border-danger focus:ring-danger-soft' : ''} ${className}`}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {rightAction && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center text-text-muted">
            {rightAction}
          </span>
        )}
      </div>
    </FieldShell>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, className = '', id, ...rest }: TextareaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <textarea
        id={inputId}
        className={`${inputBase} h-auto min-h-20 py-2 resize-y leading-relaxed ${error ? 'border-danger' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </FieldShell>
  )
}

interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  htmlFor: string
  children: ReactNode
}

function FieldShell({ label, hint, error, htmlFor, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
