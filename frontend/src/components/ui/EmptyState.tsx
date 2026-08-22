import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon, title, message, action, compact }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong text-center ${
        compact ? 'px-4 py-8' : 'px-6 py-16'
      }`}
    >
      {icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-3 text-text-muted [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </span>
      )}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-[13px] text-text-secondary">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
